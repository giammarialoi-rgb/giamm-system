package com.giammaria.system;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.webkit.JsResult;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
import android.net.Uri;
import android.content.Intent;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.app.AlertDialog;
import android.util.Log;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.CancellationSignal;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.Executors;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

public class MainActivity extends Activity {
    private WebView web;
    private NativeConfig nativeConfig;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setWebViewClient(new WebViewClient());
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        //noinspection deprecation
        s.setAllowFileAccessFromFileURLs(true);
        //noinspection deprecation
        s.setAllowUniversalAccessFromFileURLs(true);
        nativeConfig = new NativeConfig();
        web.addJavascriptInterface(nativeConfig, "NativeConfig");

        // Handle JS alerts and file picking
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (BuildConfig.DEBUG) Log.d("GiammariaWebView", "Web permission request: " + java.util.Arrays.toString(request.getResources()));
                runOnUiThread(() -> {
                    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        request.deny();
                    } else {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    }
                });
            }
            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(view.getContext())
                    .setTitle("GIAMMARIA SYSTEM")
                    .setMessage(message)
                    .setPositiveButton("OK", (dialog, which) -> result.confirm())
                    .setCancelable(false)
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(view.getContext())
                    .setTitle("GIAMMARIA SYSTEM")
                    .setMessage(message)
                    .setPositiveButton("SÌ", (dialog, which) -> result.confirm())
                    .setNegativeButton("NO", (dialog, which) -> result.cancel())
                    .setCancelable(false)
                    .show();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                }
                uploadMessage = filePathCallback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel"
                });
                startActivityForResult(Intent.createChooser(i, "Seleziona File"), FILECHOOSER_RESULTCODE);
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG) {
                    Log.d("GiammariaWebView", message.message() + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
                }
                return true;
            }
        });

        web.setBackgroundColor(0xFF090909);
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 20);
        }
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }

    /** Configuration only: API secrets must never be embedded in the APK. */
    private final class NativeConfig implements RecognitionListener, TextToSpeech.OnInitListener {
        private SpeechRecognizer recognizer;
        private TextToSpeech textToSpeech;
        private CredentialManager credentialManager;

        @JavascriptInterface
        public String getCoachApiUrl() {
            return BuildConfig.COACH_API_URL;
        }

        @JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(() -> {
                if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isEmpty()) {
                    notifyAuthError("Google non configurato: manca il Web client ID.");
                    return;
                }
                try {
                    credentialManager = CredentialManager.create(MainActivity.this);
                    GetGoogleIdOption googleOption = new GetGoogleIdOption.Builder()
                        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        .setFilterByAuthorizedAccounts(false)
                        .setAutoSelectEnabled(false)
                        .build();
                    GetCredentialRequest request = new GetCredentialRequest.Builder()
                        .addCredentialOption(googleOption)
                        .build();
                    credentialManager.getCredentialAsync(
                        MainActivity.this,
                        request,
                        new CancellationSignal(),
                        Executors.newSingleThreadExecutor(),
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override public void onResult(GetCredentialResponse response) {
                                try {
                                    GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(response.getCredential().getData());
                                    String token = google.getIdToken();
                                    web.post(() -> web.evaluateJavascript("window.nativeGoogleResult && window.nativeGoogleResult(" + JSONObject.quote(token) + ")", null));
                                } catch (Exception error) {
                                    notifyAuthError("Risposta Google non valida.");
                                }
                            }
                            @Override public void onError(GetCredentialException error) {
                                notifyAuthError("Accesso Google annullato o non riuscito.");
                            }
                        }
                    );
                } catch (Exception error) {
                    Log.e("GiammariaWebView", "GOOGLE_CREDENTIAL_ERROR", error);
                    notifyAuthError("Accesso Google non disponibile.");
                }
            });
        }

        @JavascriptInterface
        public void startAppleAuth() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.COACH_API_URL + "/api/auth/apple/start")));
                } catch (Exception error) {
                    Log.e("GiammariaWebView", "APPLE_AUTH_START_ERROR", error);
                    notifyAuthError("Impossibile aprire Apple Login.");
                }
            });
        }

        @JavascriptInterface
        public void startVoiceInput() {
            runOnUiThread(() -> {
                if (!SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                    notifyVoiceStatus("error", "Riconoscimento vocale non disponibile");
                    return;
                }
                if (recognizer != null) recognizer.destroy();
                recognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
                recognizer.setRecognitionListener(this);
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT");
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
                notifyVoiceStatus("listening", "Ascolto…");
                recognizer.startListening(intent);
            });
        }

        @JavascriptInterface
        public void stopVoiceInput() {
            runOnUiThread(() -> {
                if (recognizer != null) {
                    recognizer.cancel();
                    recognizer.destroy();
                    recognizer = null;
                }
                notifyVoiceStatus("idle", "");
            });
        }

        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (textToSpeech == null) textToSpeech = new TextToSpeech(MainActivity.this, this);
                if (textToSpeech != null) {
                    textToSpeech.stop();
                    textToSpeech.setLanguage(Locale.ITALIAN);
                    textToSpeech.speak(text == null ? "" : text, TextToSpeech.QUEUE_FLUSH, null, "coach-reply");
                }
            });
        }

        @JavascriptInterface
        public void stopSpeech() {
            runOnUiThread(() -> { if (textToSpeech != null) textToSpeech.stop(); });
        }

        void release() {
            if (recognizer != null) {
                recognizer.destroy();
                recognizer = null;
            }
            if (textToSpeech != null) {
                textToSpeech.stop();
                textToSpeech.shutdown();
                textToSpeech = null;
            }
        }

        private void notifyVoiceStatus(String state, String message) {
            if (web == null) return;
            String js = "window.nativeVoiceStatus && window.nativeVoiceStatus("
                    + JSONObject.quote(state) + "," + JSONObject.quote(message) + ");";
            web.post(() -> web.evaluateJavascript(js, null));
        }

        private void notifyVoiceResult(String text) {
            if (web == null) return;
            String js = "window.nativeVoiceResult && window.nativeVoiceResult(" + JSONObject.quote(text) + ");";
            web.post(() -> web.evaluateJavascript(js, null));
        }

        private void notifyAuthError(String message) {
            if (web == null) return;
            String js = "window.nativeAuthError && window.nativeAuthError(" + JSONObject.quote(message) + ");";
            web.post(() -> web.evaluateJavascript(js, null));
        }

        @Override public void onReadyForSpeech(Bundle params) { notifyVoiceStatus("listening", "Ascolto…"); }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rmsdB) { }
        @Override public void onBufferReceived(byte[] buffer) { }
        @Override public void onEndOfSpeech() { notifyVoiceStatus("processing", "Elaborazione…"); }
        @Override public void onPartialResults(Bundle partialResults) { }
        @Override public void onEvent(int eventType, Bundle params) { }
        @Override public void onError(int error) {
            String message = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
                    ? "Permesso microfono negato"
                    : error == SpeechRecognizer.ERROR_NO_MATCH ? "Nessuna voce riconosciuta" : "Errore riconoscimento vocale";
            notifyVoiceStatus("error", message);
            if (recognizer != null) { recognizer.destroy(); recognizer = null; }
        }

        @Override public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches != null && !matches.isEmpty()) notifyVoiceResult(matches.get(0));
            notifyVoiceStatus("idle", "");
            if (recognizer != null) { recognizer.destroy(); recognizer = null; }
        }
        @Override public void onInit(int status) {
            if (status == TextToSpeech.SUCCESS && textToSpeech != null) textToSpeech.setLanguage(Locale.ITALIAN);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent == null ? null : intent.getData();
        if (data != null && "giammaria".equals(data.getScheme()) && "oauth".equals(data.getHost())
                && "apple".equals(data.getPathSegments().isEmpty() ? "" : data.getPathSegments().get(0))) {
            String code = data.getQueryParameter("code");
            if (code != null && web != null) {
                web.post(() -> web.evaluateJavascript("window.nativeAppleResult && window.nativeAppleResult(" + JSONObject.quote(code) + ")", null));
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri result = intent == null || resultCode != RESULT_OK ? null : intent.getData();
            if (result != null) {
                logSelectedFile(result);
                uploadMessage.onReceiveValue(new Uri[]{result});
            } else {
                uploadMessage.onReceiveValue(null);
            }
            uploadMessage = null;
        }
    }

    private void logSelectedFile(Uri uri) {
        if (!BuildConfig.DEBUG) return;
        String name = null;
        long size = -1;
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex >= 0) name = cursor.getString(nameIndex);
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex);
            }
        } catch (Exception error) {
            Log.w("GiammariaWebView", "Unable to inspect selected content URI", error);
        }
        String extension = name != null && name.lastIndexOf('.') >= 0
            ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
            : "";
        Log.d("GiammariaWebView", "Selected file name=" + name
            + " extension=" + extension
            + " mime=" + getContentResolver().getType(uri)
            + " size=" + size
            + " uriScheme=" + uri.getScheme());
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        new AlertDialog.Builder(this)
            .setTitle("USCITA")
            .setMessage("Vuoi salvare i progressi prima di uscire dal Giammaria System?")
            .setPositiveButton("SALVA ED ESCI", (dialog, which) -> {
                web.evaluateJavascript("persist();", null);
                finish();
            })
            .setNegativeButton("ESCI", (dialog, which) -> finish())
            .setNeutralButton("ANNULLA", null)
            .show();
    }

    @Override
    protected void onDestroy() {
        if (nativeConfig != null) nativeConfig.release();
        if (web != null) {
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
