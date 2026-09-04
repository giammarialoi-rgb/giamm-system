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
import android.content.ContentValues;
import android.database.Cursor;
import android.provider.MediaStore;
import android.widget.Toast;
import android.provider.OpenableColumns;
import android.app.AlertDialog;
import android.util.Log;
import android.util.Base64;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.CancellationSignal;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Executors;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

public class MainActivity extends Activity {
    private WebView web;
    private NativeConfig nativeConfig;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;
    private final static int CAMERA_CAPTURE_RESULTCODE = 2;
    private final static int HC_PERMISSION_REQ = 42;
    private static final String TAG_EXCEL = "GiammariaExcel";
    private static final String TAG_HC = "GiammariaHealth";
    private Uri cameraCaptureUri = null;
    private volatile JSONObject lastPickedDocument = null;
    private volatile String lastHealthTotals = "{\"kcal\":0}";

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web = new WebView(this);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (lastPickedDocument != null) {
                    dispatchPickedDocumentToWeb();
                }
            }
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        //noinspection deprecation
        s.setAllowFileAccessFromFileURLs(true);
        //noinspection deprecation
        s.setAllowUniversalAccessFromFileURLs(true);
        nativeConfig = new NativeConfig();
        web.addJavascriptInterface(nativeConfig, "NativeConfig");
        // Warm CredentialManager + TTS so first Google login / speak is not cold-start slow
        try { nativeConfig.warmAuthAndTts(); } catch (Exception ignored) {}

        // Handle JS alerts and file picking
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (BuildConfig.DEBUG) Log.d("GiammariaWebView", "Web permission request: " + java.util.Arrays.toString(request.getResources()));
                runOnUiThread(() -> {
                    java.util.ArrayList<String> granted = new java.util.ArrayList<>();
                    boolean needCamera = false;
                    boolean needAudio = false;
                    for (String res : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) needCamera = true;
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) needAudio = true;
                    }
                    if (needCamera) {
                        if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 21);
                            // Grant after user responds — still try grant for WebView session if already OK next time
                        }
                        if (checkSelfPermission(android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                            granted.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                        }
                    }
                    if (needAudio) {
                        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 20);
                        }
                        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            granted.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                        }
                    }
                    if (!granted.isEmpty()) {
                        request.grant(granted.toArray(new String[0]));
                    } else {
                        request.deny();
                    }
                });
            }
            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(view.getContext())
                    .setTitle("Nurvan")
                    .setMessage(message)
                    .setPositiveButton("OK", (dialog, which) -> result.confirm())
                    .setCancelable(false)
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(view.getContext())
                    .setTitle("Nurvan")
                    .setMessage(message)
                    .setPositiveButton("S\u00cc", (dialog, which) -> result.confirm())
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
                String[] accept = fileChooserParams != null ? fileChooserParams.getAcceptTypes() : null;
                boolean wantsImage = false;
                if (accept != null) {
                    for (String a : accept) {
                        if (a != null && a.startsWith("image")) { wantsImage = true; break; }
                    }
                }
                boolean captureHint = fileChooserParams != null && fileChooserParams.isCaptureEnabled();
                if (wantsImage || captureHint) {
                    if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 21);
                    }
                    Intent cam = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
                    Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
                    gallery.addCategory(Intent.CATEGORY_OPENABLE);
                    gallery.setType("image/*");
                    Intent chooser = Intent.createChooser(gallery, "Foto barcode / documento");
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{ cam });
                    try {
                        startActivityForResult(chooser, FILECHOOSER_RESULTCODE);
                        return true;
                    } catch (Exception e) {
                        Log.e("GiammariaWebView", "camera chooser failed", e);
                    }
                }
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain",
                    "text/csv",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "application/octet-stream"
                });
                startActivityForResult(Intent.createChooser(i, "Seleziona File"), FILECHOOSER_RESULTCODE);
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.d("GiammariaWebView", message.message() + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
                return true;
            }
        });

        web.setBackgroundColor(0xFF090909);
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            java.util.ArrayList<String> perms = new java.util.ArrayList<>();
            if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.RECORD_AUDIO);
            }
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.CAMERA);
            }
            requestPermissions(perms.toArray(new String[0]), 20);
        }
        web.clearCache(true);
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
        maybeShowHealthRationale(getIntent());

        Intent intent = getIntent();
        if (intent != null) {
            if (intent.getData() != null) {
                Uri data = intent.getData();
                if ("content".equals(data.getScheme()) || "file".equals(data.getScheme())) {
                    handlePickedDocument(data);
                }
            }
            if (intent.getStringExtra("evalJs") != null) {
                String script = intent.getStringExtra("evalJs").trim();
                if (script.startsWith("'") && script.endsWith("'") && script.length() >= 2) {
                    script = script.substring(1, script.length() - 1);
                }
                final String finalScript = script;
                web.postDelayed(() -> web.evaluateJavascript(finalScript, null), 800);
            }
        }
    }

    /** Configuration only: API secrets must never be embedded in the APK. */
    private final class NativeConfig implements RecognitionListener, TextToSpeech.OnInitListener {
        private SpeechRecognizer recognizer;
        private TextToSpeech textToSpeech;
        private CredentialManager credentialManager;
        private CancellationSignal googleCancel;
        private String pendingSpeakText;
        private String pendingSpeakLang;

        @JavascriptInterface
        public String getCoachApiUrl() {
            return BuildConfig.COACH_API_URL;
        }

        @JavascriptInterface
        public String getGoogleClientId() {
            return BuildConfig.GOOGLE_WEB_CLIENT_ID;
        }

        /** Pre-warm CredentialManager + TTS off the critical path of first user tap. */
        void warmAuthAndTts() {
            runOnUiThread(() -> {
                try {
                    if (credentialManager == null) {
                        credentialManager = CredentialManager.create(MainActivity.this);
                    }
                } catch (Exception ignored) {}
                try {
                    if (textToSpeech == null) {
                        textToSpeech = new TextToSpeech(MainActivity.this, status -> {
                            if (status == TextToSpeech.SUCCESS && textToSpeech != null) {
                                try {
                                    textToSpeech.setSpeechRate(1.12f);
                                    textToSpeech.setPitch(1.0f);
                                    textToSpeech.setLanguage(Locale.ITALIAN);
                                } catch (Exception ignored) {}
                            }
                        });
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null) return;
                int dur = Math.max(30, Math.min(ms, 2000));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(dur, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(dur);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openHealthConnect() {
            runOnUiThread(() -> requestHealthConnectAccess());
        }

        @JavascriptInterface
        public void pickDocument() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain",
                    "text/csv",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "application/octet-stream"
                });
                startActivityForResult(Intent.createChooser(i, "Seleziona File"), FILECHOOSER_RESULTCODE);
            });
        }

        /** Open camera to photograph a training card for import. */
        @JavascriptInterface
        public void pickCamera() {
            runOnUiThread(() -> {
                try {
                    if (checkSelfPermission(android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 21);
                    }
                    File dir = new File(getCacheDir(), "share");
                    if (!dir.exists()) dir.mkdirs();
                    File photo = new File(dir, "scheda-" + System.currentTimeMillis() + ".jpg");
                    cameraCaptureUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            photo
                    );
                    Intent cam = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
                    cam.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, cameraCaptureUri);
                    cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(cam, CAMERA_CAPTURE_RESULTCODE);
                } catch (Exception e) {
                    Log.e("GiammariaWebView", "pickCamera failed", e);
                    pickDocument();
                }
            });
        }

        @JavascriptInterface
        public String getLastPickedDocument() {
            return lastPickedDocument != null ? lastPickedDocument.toString() : null;
        }

        @JavascriptInterface
        public void clearLastPickedDocument() {
            lastPickedDocument = null;
        }

        @JavascriptInterface
        public void logDiagnostic(String tag, String message) {
            if (tag == null || message == null) return;
            Log.i(tag, message);
        }

        @JavascriptInterface
        public void writeHealthSession(String json) {
            Log.i(TAG_HC, "HC_WRITE bytes=" + (json == null ? 0 : json.length()));
            lastHealthTotals = json != null ? json : lastHealthTotals;
            try {
                getSharedPreferences("gs_health", MODE_PRIVATE)
                    .edit()
                    .putString("last_session", json != null ? json : "{}")
                    .putLong("updated_at", System.currentTimeMillis())
                    .apply();
            } catch (Exception ignored) {}
            // Attempt Health Connect write on background thread when SDK available
            final String payload = json;
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    int status = HealthConnectClient.getSdkStatus(MainActivity.this);
                    if (status != HealthConnectClient.SDK_AVAILABLE) {
                        Log.i(TAG_HC, "HC_WRITE skipped status=" + status);
                        return;
                    }
                    JSONObject o = new JSONObject(payload != null ? payload : "{}");
                    double kcal = o.optDouble("kcal", 0);
                    long durationSec = o.optLong("durationSec", 0);
                    String title = o.optString("title", "Allenamento");
                    // Store enriched totals for JS readback (real HC insertRecords requires Kotlin record builders;
                    // we persist a structured sample with provenance for the readiness engine).
                    JSONObject enriched = new JSONObject();
                    enriched.put("kcal", kcal);
                    enriched.put("durationSec", durationSec);
                    enriched.put("title", title);
                    enriched.put("source", "health_connect_bridge");
                    enriched.put("kind", "estimate");
                    enriched.put("confidence", 0.5);
                    enriched.put("updatedAt", System.currentTimeMillis());
                    lastHealthTotals = enriched.toString();
                    getSharedPreferences("gs_health", MODE_PRIVATE)
                        .edit()
                        .putString("last_session", lastHealthTotals)
                        .apply();
                    Log.i(TAG_HC, "HC_WRITE persisted local sample kcal=" + kcal);
                } catch (Exception error) {
                    Log.w(TAG_HC, "HC_WRITE enrich failed", error);
                }
            });
        }

        @JavascriptInterface
        public String getHealthTotals() {
            try {
                String saved = getSharedPreferences("gs_health", MODE_PRIVATE).getString("last_session", null);
                if (saved != null && !saved.isEmpty()) return saved;
            } catch (Exception ignored) {}
            return lastHealthTotals != null ? lastHealthTotals : "{\"kcal\":0,\"source\":\"none\",\"kind\":\"estimate\"}";
        }

        @JavascriptInterface
        public void setHealthSample(String json) {
            try {
                JSONObject o = new JSONObject(json != null ? json : "{}");
                String prev = getSharedPreferences("gs_health", MODE_PRIVATE).getString("last_session", "{}");
                JSONObject merged = new JSONObject(prev != null ? prev : "{}");
                if (o.has("steps")) merged.put("steps", o.optInt("steps"));
                if (o.has("sleepHours")) merged.put("sleepHours", o.optDouble("sleepHours"));
                if (o.has("restingHr")) merged.put("restingHr", o.optDouble("restingHr"));
                if (o.has("hrvMs")) merged.put("hrvMs", o.optDouble("hrvMs"));
                if (o.has("kcal")) merged.put("kcal", o.optDouble("kcal"));
                merged.put("source", o.optString("source", "user_or_bridge"));
                merged.put("kind", o.optString("kind", "estimate"));
                merged.put("updatedAt", System.currentTimeMillis());
                lastHealthTotals = merged.toString();
                getSharedPreferences("gs_health", MODE_PRIVATE)
                    .edit()
                    .putString("last_session", lastHealthTotals)
                    .apply();
                Log.i(TAG_HC, "HC_SAMPLE set from JS");
            } catch (Exception error) {
                Log.w(TAG_HC, "setHealthSample failed", error);
            }
        }

        @JavascriptInterface
        public void refreshHealthSample() {
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    int status = HealthConnectClient.getSdkStatus(MainActivity.this);
                    JSONObject o = new JSONObject();
                    try {
                        String prev = getSharedPreferences("gs_health", MODE_PRIVATE).getString("last_session", "{}");
                        o = new JSONObject(prev != null ? prev : "{}");
                    } catch (Exception ignored) {}
                    o.put("hcSdkStatus", status);
                    o.put("source", status == HealthConnectClient.SDK_AVAILABLE ? "health_connect_bridge" : "local_estimate");
                    o.put("kind", "estimate");
                    o.put("confidence", status == HealthConnectClient.SDK_AVAILABLE ? 0.45 : 0.3);
                    o.put("updatedAt", System.currentTimeMillis());
                    o.put("note", "Aggregate read richiede SDK Kotlin; sample arricchito da sessione/permessi");
                    lastHealthTotals = o.toString();
                    getSharedPreferences("gs_health", MODE_PRIVATE)
                        .edit()
                        .putString("last_session", lastHealthTotals)
                        .apply();
                    Log.i(TAG_HC, "HC_REFRESH status=" + status);
                    if (web != null) {
                        web.post(() -> {
                            try {
                                web.evaluateJavascript(
                                    "(function(){try{if(window.syncHealthSamplesAndRefresh)window.syncHealthSamplesAndRefresh();}catch(e){}})();",
                                    null);
                            } catch (Exception ignored) {}
                        });
                    }
                } catch (Exception error) {
                    Log.w(TAG_HC, "refreshHealthSample failed", error);
                }
            });
        }

        @JavascriptInterface
        public void requestNotifications() {
            runOnUiThread(() -> {
                ReminderReceiver.ensureChannel(MainActivity.this);
                if (Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 77);
                    }
                }
            });
        }

        @JavascriptInterface
        public void scheduleReminder(String json) {
            try {
                JSONObject o = new JSONObject(json != null ? json : "{}");
                String id = o.optString("id", "rem_" + System.currentTimeMillis());
                String title = o.optString("title", "Promemoria Nurvan");
                String body = o.optString("body", o.optString("message", "Hai un promemoria"));
                long when = o.optLong("at", System.currentTimeMillis() + 60_000L);
                long repeat = o.optLong("repeatEveryMs", o.optLong("repeat_every_ms", 0L));
                ReminderReceiver.schedule(MainActivity.this, id, title, body, when, repeat);
                Log.i("GiammariaReminder", "scheduled id=" + id + " at=" + when);
            } catch (Exception error) {
                Log.w("GiammariaReminder", "schedule failed", error);
            }
        }

        @JavascriptInterface
        public void cancelReminder(String id) {
            try {
                ReminderReceiver.cancel(MainActivity.this, String.valueOf(id));
            } catch (Exception error) {
                Log.w("GiammariaReminder", "cancel failed", error);
            }
        }

        @JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(() -> {
                if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isEmpty()) {
                    notifyAuthError("Google non configurato: manca il Web client ID.");
                    return;
                }
                try {
                    Log.i("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_START clientLen=" + (BuildConfig.GOOGLE_WEB_CLIENT_ID == null ? 0 : BuildConfig.GOOGLE_WEB_CLIENT_ID.length()));
                    if (credentialManager == null) {
                        credentialManager = CredentialManager.create(MainActivity.this);
                    }
                    if (googleCancel != null) googleCancel.cancel();
                    googleCancel = new CancellationSignal();
                    // Fast path: authorized accounts + auto-select (returning users) — skip SIWG round-trip
                    GetGoogleIdOption fastOption = new GetGoogleIdOption.Builder()
                        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        .setFilterByAuthorizedAccounts(true)
                        .setAutoSelectEnabled(true)
                        .build();
                    GetCredentialRequest request = new GetCredentialRequest.Builder()
                        .addCredentialOption(fastOption)
                        .build();
                    credentialManager.getCredentialAsync(
                        MainActivity.this,
                        request,
                        googleCancel,
                        Executors.newSingleThreadExecutor(),
                        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                            @Override public void onResult(GetCredentialResponse response) {
                                handleGoogleCredential(response);
                            }
                            @Override public void onError(GetCredentialException error) {
                                Log.e("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_FAST_ERROR type=" + error.getType() + " class=" + error.getClass().getSimpleName() + " msg=" + String.valueOf(error.getMessage()));
                                fallbackSignInWithGoogle(error);
                            }
                        }
                    );
                } catch (Exception error) {
                    Log.e("GiammariaWebView", "GOOGLE_CREDENTIAL_ERROR", error);
                    notifyAuthError("Accesso Google non disponibile.");
                }
            });
        }

        private void fallbackSignInWithGoogle(GetCredentialException firstError) {
            try {
                if (credentialManager == null) {
                    credentialManager = CredentialManager.create(MainActivity.this);
                }
                googleCancel = new CancellationSignal();
                GetSignInWithGoogleOption siwg = new GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(siwg)
                    .build();
                credentialManager.getCredentialAsync(
                    MainActivity.this,
                    request,
                    googleCancel,
                    Executors.newSingleThreadExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            handleGoogleCredential(response);
                        }
                        @Override public void onError(GetCredentialException error) {
                            Log.e("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_SIWG_ERROR type=" + error.getType() + " class=" + error.getClass().getSimpleName() + " msg=" + String.valueOf(error.getMessage()));
                            fallbackGoogleIdAllAccounts(error != null ? error : firstError);
                        }
                    }
                );
            } catch (Exception error) {
                Log.e("GiammariaWebView", "GOOGLE_SIWG_FALLBACK_ERROR", error);
                fallbackGoogleIdAllAccounts(firstError);
            }
        }

        private void fallbackGoogleIdAllAccounts(GetCredentialException firstError) {
            try {
                GetGoogleIdOption googleOption = new GetGoogleIdOption.Builder()
                    .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(googleOption)
                    .build();
                googleCancel = new CancellationSignal();
                credentialManager.getCredentialAsync(
                    MainActivity.this,
                    request,
                    googleCancel,
                    Executors.newSingleThreadExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            handleGoogleCredential(response);
                        }
                        @Override public void onError(GetCredentialException error) {
                            Log.e("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_ON_ERROR type=" + error.getType() + " class=" + error.getClass().getSimpleName() + " msg=" + String.valueOf(error.getMessage()));
                            String detail = error.getMessage() != null ? error.getMessage() : error.getType();
                            notifyAuthError("Accesso Google: " + detail);
                        }
                    }
                );
            } catch (Exception error) {
                Log.e("GiammariaWebView", "GOOGLE_FALLBACK_ERROR", error);
                String detail = firstError != null && firstError.getMessage() != null ? firstError.getMessage() : (firstError != null ? firstError.getType() : "errore");
                notifyAuthError("Accesso Google: " + detail);
            }
        }

        private void handleGoogleCredential(GetCredentialResponse response) {
            try {
                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(response.getCredential().getData());
                String token = google.getIdToken();
                int tokenLen = token == null ? 0 : token.length();
                Log.i("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_ON_RESULT tokenLen=" + tokenLen);
                web.post(() -> web.evaluateJavascript("window.nativeGoogleResult && window.nativeGoogleResult(" + JSONObject.quote(token) + ")", null));
            } catch (Exception error) {
                Log.e("GiammariaWebView", "[GS-DEBUG-34] GOOGLE_PARSE_ERROR " + error.getMessage());
                notifyAuthError("Risposta Google non valida.");
            }
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
                notifyVoiceStatus("listening", "Ascolto\u2026");
                recognizer.startListening(intent);
            });
        }

        @JavascriptInterface
        public void startVoiceInputWithLang(String lang) {
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
                String tag = (lang == null || lang.trim().isEmpty()) ? "it-IT" : lang.trim();
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, tag);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, tag);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
                notifyVoiceStatus("listening", "Ascolto\u2026");
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
            speakWithLang(text, "it-IT");
        }

        @JavascriptInterface
        public void speakWithLang(String text, String lang) {
            runOnUiThread(() -> {
                pendingSpeakText = text == null ? "" : text;
                pendingSpeakLang = lang;
                if (textToSpeech == null) {
                    textToSpeech = new TextToSpeech(MainActivity.this, this);
                    return;
                }
                flushPendingSpeak();
            });
        }

        private Locale localeFromTag(String lang) {
            if (lang == null || lang.trim().isEmpty()) return Locale.ITALIAN;
            String tag = lang.trim().replace('_', '-');
            try {
                if (tag.contains("-")) {
                    String[] p = tag.split("-");
                    return new Locale(p[0], p.length > 1 ? p[1] : "");
                }
                if ("ru".equalsIgnoreCase(tag)) return new Locale("ru", "RU");
                if ("zh".equalsIgnoreCase(tag)) return Locale.SIMPLIFIED_CHINESE;
                if ("ar".equalsIgnoreCase(tag)) return new Locale("ar");
                if ("hi".equalsIgnoreCase(tag)) return new Locale("hi", "IN");
                if ("pt".equalsIgnoreCase(tag)) return new Locale("pt", "BR");
                if ("en".equalsIgnoreCase(tag)) return Locale.US;
                if ("fr".equalsIgnoreCase(tag)) return Locale.FRENCH;
                if ("de".equalsIgnoreCase(tag)) return Locale.GERMAN;
                if ("es".equalsIgnoreCase(tag)) return new Locale("es", "ES");
                if ("it".equalsIgnoreCase(tag)) return Locale.ITALIAN;
                return new Locale(tag);
            } catch (Exception ignored) {
                return Locale.ITALIAN;
            }
        }

        private void flushPendingSpeak() {
            if (textToSpeech == null || pendingSpeakText == null) return;
            Locale loc = localeFromTag(pendingSpeakLang);
            int result = textToSpeech.setLanguage(loc);
            Log.i("GiammariaWebView", "[GS-DEBUG-34] TTS_LANG tag=" + pendingSpeakLang + " locale=" + loc + " result=" + result);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                notifyVoiceStatus("error", "Lingua vocale non installata sul telefono: " + loc);
            }
            try {
                textToSpeech.setSpeechRate(1.12f);
                textToSpeech.setPitch(1.0f);
                java.util.Set<java.util.Locale> langs = textToSpeech.getAvailableLanguages();
                if (langs != null) {
                    for (java.util.Locale avail : langs) {
                        if (avail != null && loc.getLanguage().equalsIgnoreCase(avail.getLanguage())) {
                            textToSpeech.setLanguage(avail);
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}
            textToSpeech.speak(pendingSpeakText, TextToSpeech.QUEUE_FLUSH, null, "coach-reply");
            pendingSpeakText = null;
        }

        @JavascriptInterface
        public void stopSpeech() {
            runOnUiThread(() -> { if (textToSpeech != null) textToSpeech.stop(); });
        }

        private File writeShareCache(byte[] bytes, String filename) throws Exception {
            File dir = new File(getCacheDir(), "share");
            if (!dir.exists() && !dir.mkdirs()) {
                Log.w("GiammariaWebView", "share cache mkdir failed");
            }
            String safe = (filename == null || filename.trim().isEmpty())
                    ? ("nurvan-" + System.currentTimeMillis())
                    : filename.replaceAll("[^a-zA-Z0-9._\\-àèéìòùÀÈÉÌÒÙ ]", "_");
            if (safe.length() > 80) safe = safe.substring(0, 80);
            File out = new File(dir, safe);
            try (FileOutputStream fos = new FileOutputStream(out)) {
                fos.write(bytes);
            }
            return out;
        }

        private boolean saveToDownloads(byte[] bytes, String filename, String mime) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, mime != null ? mime : "application/pdf");
                if (Build.VERSION.SDK_INT >= 29) {
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return false;
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        if (os == null) return false;
                        os.write(bytes);
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    getContentResolver().update(uri, values, null, null);
                    return true;
                }
            } catch (Exception e) {
                Log.e("GiammariaWebView", "saveToDownloads failed", e);
            }
            return false;
        }

        /** Save any file (PDF, etc.) into Downloads. */
        @JavascriptInterface
        public void downloadFile(String base64, String filename, String mime) {
            runOnUiThread(() -> {
                try {
                    if (base64 == null || base64.isEmpty()) return;
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    String name = (filename == null || filename.isEmpty()) ? "Nurvan.pdf" : filename;
                    String type = (mime == null || mime.isEmpty()) ? "application/pdf" : mime;
                    boolean ok = saveToDownloads(bytes, name, type);
                    Toast.makeText(MainActivity.this, ok ? ("PDF salvato in Download: " + name) : "Impossibile salvare il PDF", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Log.e("GiammariaWebView", "downloadFile failed", e);
                    Toast.makeText(MainActivity.this, "Errore salvataggio PDF", Toast.LENGTH_LONG).show();
                }
            });
        }

        /** Share any file (PDF) via Android ACTION_SEND — WhatsApp, Drive, Mail, Salva. */
        @JavascriptInterface
        public void shareFile(String base64, String mime, String filename, String text) {
            runOnUiThread(() -> {
                try {
                    if (base64 == null || base64.isEmpty()) return;
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    String name = (filename == null || filename.isEmpty()) ? ("nurvan-" + System.currentTimeMillis() + ".pdf") : filename;
                    String type = (mime == null || mime.isEmpty()) ? "application/pdf" : mime;
                    saveToDownloads(bytes, name, type);
                    File out = writeShareCache(bytes, name);
                    Uri uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            out
                    );
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType(type);
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    send.putExtra(Intent.EXTRA_SUBJECT, name);
                    if (text != null && !text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "Salva o inoltra PDF"));
                } catch (Exception e) {
                    Log.e("GiammariaWebView", "shareFile failed", e);
                    Toast.makeText(MainActivity.this, "Errore condivisione PDF", Toast.LENGTH_LONG).show();
                }
            });
        }

        /** Share PNG (base64) via Android ACTION_SEND — used by NURVAN social workout card. */
        @JavascriptInterface
        public void shareImageFile(String base64, String mime, String text) {
            runOnUiThread(() -> {
                try {
                    if (base64 == null || base64.isEmpty()) return;
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    File dir = new File(getCacheDir(), "share");
                    if (!dir.exists() && !dir.mkdirs()) {
                        Log.w("GiammariaWebView", "share cache mkdir failed");
                    }
                    File out = new File(dir, "nurvan-workout-" + System.currentTimeMillis() + ".png");
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        fos.write(bytes);
                    }
                    Uri uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            out
                    );
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType(mime != null && !mime.isEmpty() ? mime : "image/png");
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    if (text != null && !text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "Condividi NURVAN"));
                } catch (Exception e) {
                    Log.e("GiammariaWebView", "shareImageFile failed", e);
                }
            });
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

        @Override public void onReadyForSpeech(Bundle params) { notifyVoiceStatus("listening", "Ascolto\u2026"); }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rmsdB) { }
        @Override public void onBufferReceived(byte[] buffer) { }
        @Override public void onEndOfSpeech() { notifyVoiceStatus("processing", "Elaborazione\u2026"); }
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
            if (status == TextToSpeech.SUCCESS && textToSpeech != null) {
                flushPendingSpeak();
            } else {
                Log.e("GiammariaWebView", "[GS-DEBUG-34] TTS_INIT_FAIL status=" + status);
            }
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
        } else if (data != null && ("content".equals(data.getScheme()) || "file".equals(data.getScheme()))) {
            handlePickedDocument(data);
        }
        if (intent != null && intent.getStringExtra("evalJs") != null) {
            String script = intent.getStringExtra("evalJs").trim();
            if (script.startsWith("'") && script.endsWith("'") && script.length() >= 2) {
                script = script.substring(1, script.length() - 1);
            }
            final String finalScript = script;
            Log.i("GiammariaWebView", "Executing evalJs: " + finalScript);
            if (web != null) {
                web.post(() -> web.evaluateJavascript(finalScript, (res) -> {
                    Log.i("GiammariaWebView", "evalJs result: " + res);
                }));
            }
        }
    }

    private void maybeShowHealthRationale(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if ("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE".equals(action)
            || Intent.ACTION_VIEW_PERMISSION_USAGE.equals(action)) {
            new AlertDialog.Builder(this)
                .setTitle("Connessione Salute")
                .setMessage("Nurvan usa Connessione Salute per leggere e scrivere allenamenti, frequenza cardiaca, calorie, passi e peso.")
                .setPositiveButton("OK", null)
                .show();
        }
    }

    private Set<String> healthConnectPermissionSet() {
        return new HashSet<>(Arrays.asList(
            "android.permission.health.READ_EXERCISE",
            "android.permission.health.WRITE_EXERCISE",
            "android.permission.health.READ_HEART_RATE",
            "android.permission.health.WRITE_HEART_RATE",
            "android.permission.health.READ_RESTING_HEART_RATE",
            "android.permission.health.WRITE_RESTING_HEART_RATE",
            "android.permission.health.READ_TOTAL_CALORIES_BURNED",
            "android.permission.health.WRITE_TOTAL_CALORIES_BURNED",
            "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
            "android.permission.health.WRITE_ACTIVE_CALORIES_BURNED",
            "android.permission.health.READ_WEIGHT",
            "android.permission.health.WRITE_WEIGHT",
            "android.permission.health.READ_STEPS",
            "android.permission.health.WRITE_STEPS",
            "android.permission.health.READ_DISTANCE",
            "android.permission.health.WRITE_DISTANCE",
            "android.permission.health.READ_SLEEP",
            "android.permission.health.WRITE_SLEEP"
        ));
    }

    private void debugJs(String hypothesisId, String location, String message, String dataJson) {
        if (web == null) return;
        final String js = "(function(){try{if(typeof __gsDebug34Log==='function')__gsDebug34Log('"
            + hypothesisId + "','" + location + "','" + message + "'," + dataJson + ");}catch(e){}})();";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    private void dispatchPickedDocumentToWeb() {
        if (web == null || lastPickedDocument == null) return;
        web.post(() -> {
            try {
                web.evaluateJavascript(
                    "(function(){try{if(!window.NativeConfig||!NativeConfig.getLastPickedDocument)return;var s=NativeConfig.getLastPickedDocument();if(!s)return;window.nativeDocumentReceived&&window.nativeDocumentReceived(JSON.parse(s));}catch(e){console.error(e);}})();",
                    null);
            } catch (Exception error) {
                Log.e(TAG_EXCEL, "Error dispatching document to WebView", error);
            }
        });
    }

    private void openHealthConnectSettings() {
        try {
            Intent hc = new Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS");
            hc.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(hc);
        } catch (Exception e1) {
            try {
                Intent play = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"));
                play.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(play);
            } catch (Exception e2) {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(webIntent);
            }
        }
    }

    private void requestHealthConnectAccess() {
        try {
            int status = HealthConnectClient.getSdkStatus(this);
            Log.i(TAG_HC, "HC_STATUS=" + status);
            debugJs("H3", "MainActivity:requestHealthConnectAccess", "hc status", "{\"status\":" + status + "}");
            if (status == HealthConnectClient.SDK_UNAVAILABLE) {
                openHealthConnectSettings();
                return;
            }
            if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
                try {
                    Intent play = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"));
                    play.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(play);
                } catch (Exception e) {
                    openHealthConnectSettings();
                }
                return;
            }
            ActivityResultContract<Set<String>, Set<String>> contract =
                PermissionController.createRequestPermissionResultContract();
            Intent intent = contract.createIntent(this, healthConnectPermissionSet());
            startActivityForResult(intent, HC_PERMISSION_REQ);
        } catch (Exception error) {
            Log.e(TAG_HC, "HC request failed", error);
            debugJs("H3", "MainActivity:requestHealthConnectAccess", "hc error", "{\"err\":\"" + String.valueOf(error.getMessage()).replace("\"", "'") + "\"}");
            openHealthConnectSettings();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == HC_PERMISSION_REQ) {
            int granted = 0;
            try {
                ActivityResultContract<Set<String>, Set<String>> contract =
                    PermissionController.createRequestPermissionResultContract();
                Set<String> perms = contract.parseResult(resultCode, intent);
                granted = perms != null ? perms.size() : 0;
            } catch (Exception error) {
                Log.w(TAG_HC, "HC parseResult", error);
            }
            Log.i(TAG_HC, "HC_PERMS resultCode=" + resultCode + " granted=" + granted);
            debugJs("H3", "MainActivity:onActivityResult", "hc perms", "{\"granted\":" + granted + ",\"resultCode\":" + resultCode + "}");
            if (web != null) {
                web.post(() -> {
                    try {
                        web.evaluateJavascript(
                            "(function(){try{if(window.NativeConfig&&NativeConfig.refreshHealthSample)NativeConfig.refreshHealthSample();else if(window.syncHealthSamplesAndRefresh)window.syncHealthSamplesAndRefresh();}catch(e){}})();",
                            null);
                    } catch (Exception ignored) {}
                });
            }
            openHealthConnectSettings();
            return;
        }
        if (requestCode == CAMERA_CAPTURE_RESULTCODE) {
            if (resultCode == RESULT_OK && cameraCaptureUri != null) {
                boolean toWebView = uploadMessage != null;
                if (toWebView) {
                    uploadMessage.onReceiveValue(new Uri[]{cameraCaptureUri});
                    uploadMessage = null;
                } else {
                    handlePickedDocument(cameraCaptureUri);
                }
            } else if (uploadMessage != null) {
                uploadMessage.onReceiveValue(null);
                uploadMessage = null;
            }
            cameraCaptureUri = null;
            return;
        }
        if (requestCode == FILECHOOSER_RESULTCODE) {
            Uri result = (intent == null || resultCode != RESULT_OK) ? null : intent.getData();
            boolean toWebView = uploadMessage != null;
            if (toWebView) {
                uploadMessage.onReceiveValue(result != null ? new Uri[]{result} : null);
                uploadMessage = null;
            } else if (result != null) {
                handlePickedDocument(result);
            }
        }
    }

    private void handlePickedDocument(Uri uri) {
        Executors.newSingleThreadExecutor().execute(() -> {
            String name = "documento";
            long size = -1;
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                    if (nameIndex >= 0) name = cursor.getString(nameIndex);
                    if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex);
                }
            } catch (Exception error) {
                Log.w(TAG_EXCEL, "Unable to inspect selected content URI", error);
            }

            if ("documento".equals(name) && uri.getLastPathSegment() != null) {
                String last = uri.getLastPathSegment();
                if (last.contains("/")) last = last.substring(last.lastIndexOf('/') + 1);
                if (last.contains(":")) last = last.substring(last.lastIndexOf(':') + 1);
                if (last.contains(".")) name = last;
            }

            String extension = "";
            if (name != null && name.lastIndexOf('.') >= 0) {
                extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            }

            String mime = getContentResolver().getType(uri);
            if (mime == null || mime.isEmpty() || "application/octet-stream".equalsIgnoreCase(mime)) {
                if ("xlsx".equals(extension)) {
                    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                } else if ("xls".equals(extension)) {
                    mime = "application/vnd.ms-excel";
                } else if ("pdf".equals(extension)) {
                    mime = "application/pdf";
                } else if ("docx".equals(extension)) {
                    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                } else if ("doc".equals(extension)) {
                    mime = "application/msword";
                } else if ("txt".equals(extension)) {
                    mime = "text/plain";
                } else if ("png".equals(extension)) {
                    mime = "image/png";
                } else if ("jpg".equals(extension) || "jpeg".equals(extension)) {
                    mime = "image/jpeg";
                } else if ("webp".equals(extension)) {
                    mime = "image/webp";
                } else if ("csv".equals(extension)) {
                    mime = "text/csv";
                } else {
                    mime = "application/octet-stream";
                }
            }

            Log.i(TAG_EXCEL, "EXCEL_PICK: uri=" + uri + " filename=" + name + " extension=" + extension + " mime=" + mime + " size=" + size);

            byte[] bytes = null;
            try {
                InputStream in = null;
                if ("file".equals(uri.getScheme()) && uri.getPath() != null) {
                    in = new FileInputStream(new File(uri.getPath()));
                } else {
                    in = getContentResolver().openInputStream(uri);
                }
                if (in != null) {
                    try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        byte[] buffer = new byte[16384];
                        int read;
                        while ((read = stream.read(buffer)) != -1) {
                            out.write(buffer, 0, read);
                        }
                        bytes = out.toByteArray();
                    }
                }
            } catch (Exception error) {
                Log.e(TAG_EXCEL, "Error reading bytes from URI: " + uri, error);
            }

            if (bytes != null && bytes.length > 0) {
                Log.i(TAG_EXCEL, "EXCEL_READ: bytes=" + bytes.length);
                String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                final String finalName = name;
                final String finalExtension = extension;
                final String finalMime = mime;
                final int finalBytesLength = bytes.length;
                final String finalBase64 = base64;

                try {
                    JSONObject docObj = new JSONObject();
                    docObj.put("name", finalName);
                    docObj.put("extension", finalExtension);
                    docObj.put("mime", finalMime);
                    docObj.put("sizeBytes", finalBytesLength);
                    docObj.put("sizeText", String.format(Locale.ROOT, "%.1f KB", finalBytesLength / 1024.0));
                    docObj.put("base64", finalBase64);

                    lastPickedDocument = docObj;
                    dispatchPickedDocumentToWeb();
                } catch (Exception error) {
                    Log.e(TAG_EXCEL, "Error building JSON for document", error);
                }
            } else {
                Log.w(TAG_EXCEL, "EXCEL_READ: bytes=0 or null");
                if (web != null) {
                    web.post(() -> web.evaluateJavascript("alert('Impossibile leggere il file selezionato (0 byte).');", null));
                }
            }
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web != null) {
            web.evaluateJavascript(
                "(function(){try{return (window.handleNativeBack&&window.handleNativeBack())?'1':'0';}catch(e){return '0';}})();",
                value -> {
                    boolean handled = value != null && value.contains("1");
                    if (handled) return;
                    showExitDialog();
                }
            );
            return;
        }
        showExitDialog();
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
            .setTitle("USCITA")
            .setMessage("Vuoi salvare i progressi prima di uscire da Nurvan?")
            .setPositiveButton("SALVA ED ESCI", (dialog, which) -> {
                if (web != null) web.evaluateJavascript("persist();", null);
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
