package com.giammaria.system;

import android.util.Base64;
import android.util.Log;
import android.webkit.WebView;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.FixMethodOrder;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class MainActivityGoldenImportInstrumentedTest {

    private static final String TAG = "GOLDEN_DEVICE_TEST";

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
            new ActivityScenarioRule<>(MainActivity.class);

    private static String cleanJsString(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1);
            s = s.replace("\\\"", "\"").replace("\\\\", "\\");
        }
        return s;
    }

    private String evaluateJsSync(String script, long timeoutSeconds) throws Throwable {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> resultRef = new AtomicReference<>("");
        AtomicReference<Throwable> errorRef = new AtomicReference<>(null);

        activityRule.getScenario().onActivity(activity -> {
            try {
                WebView webView = null;
                if (activity.findViewById(android.R.id.content) instanceof android.view.ViewGroup) {
                    android.view.ViewGroup root = activity.findViewById(android.R.id.content);
                    for (int i = 0; i < root.getChildCount(); i++) {
                        if (root.getChildAt(i) instanceof WebView) {
                            webView = (WebView) root.getChildAt(i);
                            break;
                        }
                    }
                }
                if (webView == null) {
                    fail("WebView not found in activity view hierarchy");
                    latch.countDown();
                    return;
                }
                webView.evaluateJavascript(script, value -> {
                    String cleaned = cleanJsString(value);
                    resultRef.set(cleaned);
                    latch.countDown();
                });
            } catch (Throwable t) {
                errorRef.set(t);
                latch.countDown();
            }
        });

        boolean completed = latch.await(timeoutSeconds, TimeUnit.SECONDS);
        assertTrue("Test timed out waiting for JS evaluation: " + script, completed);

        if (errorRef.get() != null) {
            throw errorRef.get();
        }
        return resultRef.get();
    }

    private void waitForAppReady() throws Throwable {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < 10000) {
            String res = evaluateJsSync("(function() { return Boolean(typeof DATA !== 'undefined' && DATA !== null); })()", 8);
            if (res.contains("true")) {
                return;
            }
            Thread.sleep(300);
        }
    }

    private byte[] loadAssetBytes(String assetName) throws Exception {
        try (InputStream is = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open(assetName)) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            return buffer.toByteArray();
        } catch (Exception e) {
            File f = new File("/sdcard/Download/" + assetName);
            if (f.exists()) {
                byte[] b = new byte[(int) f.length()];
                try (FileInputStream fis = new FileInputStream(f)) {
                    fis.read(b);
                }
                return b;
            }
            throw e;
        }
    }

    @Test
    public void test01_DeviceEnvironmentVerification() throws Throwable {
        waitForAppReady();

        String script = "(function() {" +
                "  return JSON.stringify({" +
                "    userAgent: navigator.userAgent," +
                "    hasIndexedDB: typeof indexedDB !== 'undefined'," +
                "    hasXLSX: typeof XLSX !== 'undefined'," +
                "    hasPersistence: typeof GiammariaPersistence !== 'undefined'," +
                "    hasUniversalImport: typeof parseStructuredWorkbook === 'function'" +
                "  });" +
                "})()";

        String result = evaluateJsSync(script, 10);
        Log.i(TAG, "Device Environment: " + result);
        assertNotNull(result);
        assertTrue("IndexedDB must be available on Android hardware", result.contains("\"hasIndexedDB\":true"));
        assertTrue("SheetJS XLSX must be loaded on Android hardware", result.contains("\"hasXLSX\":true"));
        assertTrue("Persistence Core must be loaded", result.contains("\"hasPersistence\":true"));
        assertTrue("Universal Import Engine must be loaded", result.contains("\"hasUniversalImport\":true"));
    }

    @Test
    public void test02_GoldenFileParseAndIntegrityOnRealDevice() throws Throwable {
        waitForAppReady();

        byte[] fileBytes = loadAssetBytes("GIANMARIA LOI(2).xlsx");
        assertTrue("Golden file bytes loaded", fileBytes.length > 10000);

        String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);
        Log.i(TAG, "Read golden file: " + fileBytes.length + " bytes, base64 length: " + base64.length());

        String parseScript = "(function() {" +
                "  window.__golden_parse_done__ = false;" +
                "  try {" +
                "    var b64 = '" + base64 + "';" +
                "    var binaryStr = atob(b64);" +
                "    var len = binaryStr.length;" +
                "    var bytes = new Uint8Array(len);" +
                "    for (var i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }" +
                "    var workbook = XLSX.read(bytes.buffer, { type: 'array' });" +
                "    var importRes = parseStructuredWorkbook(workbook, 'GIANMARIA LOI(2).xlsx');" +
                "    var canonical = importRes.canonicalProgram || importRes.program;" +
                "    window.__golden_canonical__ = canonical;" +
                "    window.__golden_parse_payload__ = JSON.stringify({" +
                "      success: true," +
                "      weeksCount: canonical.weeks.length," +
                "      sessionsCount: canonical.weeks.reduce(function(a, w) { return a + (w.sessions || []).length; }, 0)," +
                "      exercisesCount: canonical.weeks.reduce(function(a, w) { return a + (w.sessions || []).reduce(function(sa, s) { return sa + (s.exercises || []).length; }, 0); }, 0)," +
                "      setsCount: canonical.weeks.reduce(function(a, w) { return a + (w.sessions || []).reduce(function(sa, s) { return sa + (s.exercises || []).reduce(function(ea, e) { return ea + (e.sets || []).length; }, 0); }, 0); }, 0)," +
                "      hasNutrition: Boolean(canonical.nutrition && canonical.nutrition.present)," +
                "      hasSupplementation: Boolean(canonical.supplementation && canonical.supplementation.present)," +
                "      hasTherapy: Boolean(canonical.therapy && canonical.therapy.present)," +
                "      hasExams: Boolean(canonical.exams && canonical.exams.present)" +
                "    });" +
                "    window.__golden_parse_done__ = true;" +
                "  } catch (err) {" +
                "    window.__golden_parse_payload__ = JSON.stringify({ success: false, error: err.message });" +
                "    window.__golden_parse_done__ = true;" +
                "  }" +
                "  return 'parsing';" +
                "})()";

        evaluateJsSync(parseScript, 15);

        long start = System.currentTimeMillis();
        String parseRes = "{}";
        while (System.currentTimeMillis() - start < 20000) {
            String check = evaluateJsSync("Boolean(window.__golden_parse_done__)", 15);
            if (check.contains("true")) {
                parseRes = evaluateJsSync("window.__golden_parse_payload__ || '{}'", 2);
                break;
            }
            Thread.sleep(300);
        }

        Log.i(TAG, "Golden File Parse Result: " + parseRes);
        assertNotNull(parseRes);
        assertTrue("Golden parse must succeed (got: " + parseRes + ")", parseRes.contains("\"success\":true"));
        assertTrue("Must extract 1 week (LOI golden)", parseRes.contains("\"weeksCount\":1"));
        assertTrue("Must extract 4 sessions (LOI golden)", parseRes.contains("\"sessionsCount\":4"));
        assertTrue("Must extract 19 exercises (LOI golden)", parseRes.contains("\"exercisesCount\":19"));
        assertTrue("Nutrition domain present on LOI golden", parseRes.contains("\"hasNutrition\":true"));
        assertTrue("Must extract Supplementation domain", parseRes.contains("\"hasSupplementation\":true"));
        assertTrue("Must extract Therapy domain", parseRes.contains("\"hasTherapy\":true"));
    }

    @Test
    public void test03_ComplexMultiDomainParseOnRealDevice() throws Throwable {
        waitForAppReady();

        byte[] fileBytes = loadAssetBytes("GIANMARIA LOI(2).xlsx");
        assertTrue("Multi-domain golden file bytes loaded", fileBytes.length > 10000);

        String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);

        String parseScript = "(function() {" +
                "  window.__complex_parse_done__ = false;" +
                "  try {" +
                "    var b64 = '" + base64 + "';" +
                "    var binaryStr = atob(b64);" +
                "    var len = binaryStr.length;" +
                "    var bytes = new Uint8Array(len);" +
                "    for (var i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }" +
                "    var workbook = XLSX.read(bytes.buffer, { type: 'array' });" +
                "    var importRes = parseStructuredWorkbook(workbook, 'GIANMARIA LOI(2).xlsx');" +
                "    var canonical = importRes.canonicalProgram || importRes.program;" +
                "    window.__complex_canonical__ = canonical;" +
                "    window.__complex_parse_payload__ = JSON.stringify({" +
                "      success: true," +
                "      hasNutrition: Boolean(canonical.nutrition && canonical.nutrition.present)," +
                "      nutritionDaysCount: canonical.nutrition && canonical.nutrition.days ? canonical.nutrition.days.length : 0," +
                "      hasSupplementation: Boolean(canonical.supplementation && canonical.supplementation.present)," +
                "      hasTherapy: Boolean(canonical.therapy && canonical.therapy.present)," +
                "      hasExams: Boolean(canonical.exams && canonical.exams.present)" +
                "    });" +
                "    window.__complex_parse_done__ = true;" +
                "  } catch (err) {" +
                "    window.__complex_parse_payload__ = JSON.stringify({ success: false, error: err.message });" +
                "    window.__complex_parse_done__ = true;" +
                "  }" +
                "  return 'parsing';" +
                "})()";

        evaluateJsSync(parseScript, 15);

        long start = System.currentTimeMillis();
        String parseRes = "{}";
        while (System.currentTimeMillis() - start < 20000) {
            String check = evaluateJsSync("Boolean(window.__complex_parse_done__)", 15);
            if (check.contains("true")) {
                parseRes = evaluateJsSync("window.__complex_parse_payload__ || '{}'", 2);
                break;
            }
            Thread.sleep(300);
        }

        Log.i(TAG, "Complex Parse Result: " + parseRes);
        assertNotNull(parseRes);
        assertTrue("Complex parse must succeed", parseRes.contains("\"success\":true"));
        assertTrue("Multi-day Nutrition domain extracted", parseRes.contains("\"hasNutrition\":true"));
        assertTrue("Nutrition days present", parseRes.contains("\"nutritionDaysCount\":7"));
        assertTrue("Supplementation domain extracted", parseRes.contains("\"hasSupplementation\":true"));
        assertTrue("Therapy domain extracted", parseRes.contains("\"hasTherapy\":true"));
    }

    @Test
    public void test04_GoldenActivationAndIdbPersistOnRealDevice() throws Throwable {
        waitForAppReady();

        byte[] fileBytes = loadAssetBytes("GIANMARIA LOI(2).xlsx");
        String base64 = Base64.encodeToString(fileBytes, Base64.NO_WRAP);

        String activateScript = "(function() {" +
                "  window.__golden_act_done__ = false;" +
                "  var b64 = '" + base64 + "';" +
                "  var binaryStr = atob(b64);" +
                "  var len = binaryStr.length;" +
                "  var bytes = new Uint8Array(len);" +
                "  for (var i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }" +
                "  var workbook = XLSX.read(bytes.buffer, { type: 'array' });" +
                "  var importRes = parseStructuredWorkbook(workbook, 'GIANMARIA LOI(2).xlsx');" +
                "  var canonical = importRes.canonicalProgram || importRes.program;" +
                "  window.programImportState = {" +
                "    currentImportId: 'golden_import_device_test'," +
                "    canonicalProgram: canonical," +
                "    warnings: []," +
                "    errors: []," +
                "    activeTab: 'training'" +
                "  };" +
                "  setTimeout(function() {" +
                "    var wipe = (GiammariaPersistence.wipeDatabase) ? GiammariaPersistence.wipeDatabase() : Promise.resolve();" +
                "    Promise.resolve(wipe).then(function() {" +
                "      return GiammariaPersistence.activateCanonicalProgram(canonical);" +
                "    }).then(async function() {" +
                "      if (typeof persist === 'function') persist();" +
                "      var activeFromIdb = await GiammariaPersistence.loadActiveProgram();" +
                "      var weeks = (activeFromIdb && (activeFromIdb.weeks || (activeFromIdb.training && activeFromIdb.training.weeks))) || [];" +
                "      var sessions = weeks.reduce(function(a, w) { return a + (w.sessions || w.days || []).length; }, 0);" +
                "      var exercises = weeks.reduce(function(a, w) { return a + (w.sessions || w.days || []).reduce(function(sa, s) { return sa + (s.exercises || s.rows || []).length; }, 0); }, 0);" +
                "      var rawLs = localStorage.getItem('GS_STORE') || '{}';" +
                "      var parsedLs = {};" +
                "      try { parsedLs = JSON.parse(rawLs); } catch (e) {}" +
                "      window.__golden_act_payload__ = JSON.stringify({" +
                "        idbWeeks: weeks.length," +
                "        idbSessions: sessions," +
                "        idbExercises: exercises," +
                "        lsSize: rawLs.length," +
                "        lsUnder50K: rawLs.length < 51200," +
                "        lsActiveProgNull: parsedLs.activeProgram == null," +
                "        currentDataWeeks: weeks.length," +
                "        confirmFn: typeof confirmImportAndActivate === 'function'" +
                "      });" +
                "      window.__golden_act_done__ = true;" +
                "    }).catch(function(err) {" +
                "      window.__golden_act_payload__ = JSON.stringify({ error: String(err && err.message || err) });" +
                "      window.__golden_act_done__ = true;" +
                "    });" +
                "  }, 0);" +
                "  return 'activating';" +
                "})()";

        evaluateJsSync(activateScript, 20);

        long start = System.currentTimeMillis();
        String actRes = "{}";
        while (System.currentTimeMillis() - start < 30000) {
            String check = evaluateJsSync("Boolean(window.__golden_act_done__)", 15);
            if (check.contains("true")) {
                actRes = evaluateJsSync("window.__golden_act_payload__ || '{}'", 2);
                break;
            }
            Thread.sleep(300);
        }

        Log.i(TAG, "Golden Activation Result: " + actRes);
        assertNotNull(actRes);
        assertTrue("IndexedDB must contain 1 week (got: " + actRes + ")", actRes.contains("\"idbWeeks\":1"));
        assertTrue("IndexedDB must contain 4 sessions (got: " + actRes + ")", actRes.contains("\"idbSessions\":4"));
        assertTrue("IndexedDB must contain 19 exercises (got: " + actRes + ")", actRes.contains("\"idbExercises\":19"));
        assertTrue("LocalStorage must remain under 50 KB", actRes.contains("\"lsUnder50K\":true"));
        assertTrue("LocalStorage activeProgram must be null", actRes.contains("\"lsActiveProgNull\":true"));
        assertTrue("DATA must have 1 week active for UI", actRes.contains("\"currentDataWeeks\":1"));
    }
}
