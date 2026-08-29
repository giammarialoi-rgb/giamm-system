package com.giammaria.system;

import android.util.Log;
import android.webkit.WebView;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.FixMethodOrder;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class MainActivityInstrumentedTest {

    private static final String TAG = "INSTRUMENTED_TEST";

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
                    Log.d(TAG, "evaluateJsSync: " + cleaned);
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

    @Test
    public void test01_AppLaunchAndDOMReady() throws Throwable {
        waitForAppReady();

        String script = "(function() {" +
                "  return JSON.stringify({" +
                "    domLoaded: document.readyState === 'complete' || document.readyState === 'interactive'," +
                "    hasPersistence: typeof GiammariaPersistence !== 'undefined'," +
                "    hasUniversalImport: typeof parseStructuredWorkbook === 'function'," +
                "    hasRirRpeEngine: typeof rirToRpe === 'function' && typeof rpeToRir === 'function'," +
                "    storeInitialized: typeof store !== 'undefined' && store !== null" +
                "  });" +
                "})()";

        String result = evaluateJsSync(script, 10);
        assertNotNull(result);
        assertTrue("DOM should be ready", result.contains("\"domLoaded\":true"));
        assertTrue("Persistence core should be loaded", result.contains("\"hasPersistence\":true"));
        assertTrue("Universal import engine should be loaded", result.contains("\"hasUniversalImport\":true"));
        assertTrue("RIR/RPE engine should be loaded", result.contains("\"hasRirRpeEngine\":true"));
        assertTrue("Store should be initialized", result.contains("\"storeInitialized\":true"));
    }

    @Test
    public void test02_NavigationRouting() throws Throwable {
        waitForAppReady();

        String script = "(function() {" +
                "  navigate('training');" +
                "  var afterTraining = currentView;" +
                "  navigate('import');" +
                "  var afterImport = currentView;" +
                "  navigate('stats');" +
                "  var afterStats = currentView;" +
                "  navigate('home');" +
                "  var afterHome = currentView;" +
                "  return JSON.stringify({" +
                "    afterTraining: afterTraining," +
                "    afterImport: afterImport," +
                "    afterStats: afterStats," +
                "    afterHome: afterHome" +
                "  });" +
                "})()";

        String result = evaluateJsSync(script, 10);
        assertNotNull(result);
        assertTrue("Should navigate to training", result.contains("\"afterTraining\":\"training\""));
        assertTrue("Should navigate to import", result.contains("\"afterImport\":\"import\""));
        assertTrue("Should navigate to stats", result.contains("\"afterStats\":\"stats\""));
        assertTrue("Should navigate to home", result.contains("\"afterHome\":\"home\""));
    }

    @Test
    public void test03_ReviewModificationsAndAtomicActivation() throws Throwable {
        waitForAppReady();
        Thread.sleep(400);

        String setupScript = "(function() {" +
                "  window.__inst_done__ = false;" +
                "  var sampleProg = {" +
                "    id: 'test_instrumented_prog'," +
                "    title: 'Programma Test Dispositivo Reale'," +
                "    duration_weeks: 1," +
                "    weeks: [" +
                "      {" +
                "        week_number: 1," +
                "        sessions: [" +
                "          {" +
                "            name: 'Sessione 1 - Upper'," +
                "            exercises: [" +
                "              {" +
                "                name: 'Panca Piana con Bilanciere'," +
                "                movement: 'Spinta Orizzontale'," +
                "                rir_target: 2," +
                "                rpe_target: 8," +
                "                sets: [" +
                "                  { set_number: 1, reps: 8, target_load: 80, target_rir: 2, target_rpe: 8, rest_seconds: 120 }," +
                "                  { set_number: 2, reps: 8, target_load: 80, target_rir: 2, target_rpe: 8, rest_seconds: 120 }" +
                "                ]" +
                "              }" +
                "            ]" +
                "          }" +
                "        ]" +
                "      }" +
                "    ]," +
                "    nutrition: { present: false, days: [] }," +
                "    supplementation: { present: false, items: [] }," +
                "    therapy: { present: false, medications: [] }," +
                "    exams: { present: false, records: [] }" +
                "  };" +
                "  window.programImportState = {" +
                "    currentImportId: 'test_inst_123'," +
                "    canonicalProgram: sampleProg," +
                "    warnings: []," +
                "    errors: []," +
                "    activeTab: 'training'" +
                "  };" +
                "  updateReviewExerciseField(0, 0, 0, 'rir', 1);" +
                "  window.__inst_editedRir__ = window.programImportState.canonicalProgram.weeks[0].sessions[0].exercises[0].rir_target;" +
                "  window.__inst_editedRpe__ = window.programImportState.canonicalProgram.weeks[0].sessions[0].exercises[0].rpe_target;" +
                "  setTimeout(function() {" +
                "    var prog = window.programImportState.canonicalProgram;" +
                "    var wipe = (GiammariaPersistence.wipeDatabase) ? GiammariaPersistence.wipeDatabase() : Promise.resolve();" +
                "    Promise.resolve(wipe).then(function() {" +
                "      return GiammariaPersistence.activateCanonicalProgram(prog);" +
                "    }).then(async function() {" +
                "      if (typeof persist === 'function') persist();" +
                "      var activeFromIdb = await GiammariaPersistence.loadActiveProgram();" +
                "      var weeks = (activeFromIdb && (activeFromIdb.weeks || (activeFromIdb.training && activeFromIdb.training.weeks))) || [];" +
                "      var rawLs = localStorage.getItem('GS_STORE') || '{}';" +
                "      var parsedLs = {};" +
                "      try { parsedLs = JSON.parse(rawLs); } catch (e) {}" +
                "      window.__inst_payload__ = JSON.stringify({" +
                "        editedRir: window.__inst_editedRir__," +
                "        editedRpe: window.__inst_editedRpe__," +
                "        rirToRpe1: (typeof rirToRpe === 'function') ? rirToRpe(1) : null," +
                "        idbSaved: Boolean(weeks.length === 1)," +
                "        lsActiveProgNull: parsedLs.activeProgram == null," +
                "        confirmFn: typeof confirmImportAndActivate === 'function'" +
                "      });" +
                "      window.__inst_done__ = true;" +
                "    }).catch(function(err) {" +
                "      window.__inst_payload__ = JSON.stringify({ error: String(err && err.message || err) });" +
                "      window.__inst_done__ = true;" +
                "    });" +
                "  }, 0);" +
                "  return 'started';" +
                "})()";

        evaluateJsSync(setupScript, 15);

        // Poll for completion (IDB activate can exceed 10s on device)
        long start = System.currentTimeMillis();
        String result = "{}";
        while (System.currentTimeMillis() - start < 30000) {
            String check = evaluateJsSync("Boolean(window.__inst_done__)", 15);
            if (check.contains("true")) {
                result = evaluateJsSync("window.__inst_payload__ || '{}'", 2);
                break;
            }
            Thread.sleep(300);
        }

        assertNotNull(result);
        assertTrue("RIR target updated (got: " + result + ")", result.contains("\"editedRir\":1"));
        assertTrue("RPE engine available (got: " + result + ")", result.contains("\"rirToRpe1\":9") || result.contains("\"editedRpe\":9"));
        assertTrue("Active program saved in IndexedDB (got: " + result + ")", result.contains("\"idbSaved\":true"));
        assertTrue("localStorage activeProgram is null (got: " + result + ")", result.contains("\"lsActiveProgNull\":true"));
        assertTrue("confirmImportAndActivate is defined (got: " + result + ")", result.contains("\"confirmFn\":true"));
    }

    @Test
    public void test04_RirRpeEngineLiveConversion() throws Throwable {
        waitForAppReady();
        String script = "(function() {" +
                "  return JSON.stringify({" +
                "    rpeFromRir0: rirToRpe(0)," +
                "    rpeFromRir2: rirToRpe(2)," +
                "    rpeFromRir3_5: rirToRpe(3.5)," +
                "    rirFromRpe10: rpeToRir(10)," +
                "    rirFromRpe8: rpeToRir(8)" +
                "  });" +
                "})()";

        String result = evaluateJsSync(script, 5);
        assertNotNull(result);
        assertTrue("RIR 0 -> RPE 10", result.contains("\"rpeFromRir0\":10"));
        assertTrue("RIR 2 -> RPE 8", result.contains("\"rpeFromRir2\":8"));
        assertTrue("RIR 3.5 -> RPE 6.5", result.contains("\"rpeFromRir3_5\":6.5"));
        assertTrue("RPE 10 -> RIR 0", result.contains("\"rirFromRpe10\":0"));
        assertTrue("RPE 8 -> RIR 2", result.contains("\"rirFromRpe8\":2"));
    }

    @Test
    public void test05_StorageQuotaSanityCheck() throws Throwable {
        String script = "(function() {" +
                "  var rawLs = localStorage.getItem('GS_STORE') || '';" +
                "  return JSON.stringify({" +
                "    localStorageBytes: rawLs.length," +
                "    under50Kb: rawLs.length < 51200" +
                "  });" +
                "})()";

        String result = evaluateJsSync(script, 5);
        assertNotNull(result);
        assertTrue("localStorage must be under 50 KB", result.contains("\"under50Kb\":true"));
    }
}
