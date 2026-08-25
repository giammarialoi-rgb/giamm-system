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
import android.net.Uri;
import android.content.Intent;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.app.AlertDialog;
import android.util.Log;

public class MainActivity extends Activity {
    private WebView web;
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
        web.addJavascriptInterface(new NativeConfig(), "NativeConfig");

        // Handle JS alerts and file picking
        web.setWebChromeClient(new WebChromeClient() {
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
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }

    /** Configuration only: API secrets must never be embedded in the APK. */
    private static final class NativeConfig {
        @JavascriptInterface
        public String getCoachApiUrl() {
            return BuildConfig.COACH_API_URL;
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
            ? name.substring(name.lastIndexOf('.') + 1).toLowerCase()
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
}
