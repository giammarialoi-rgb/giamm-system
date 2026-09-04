package com.giammaria.system;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

public class ReminderReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "nurvan_reminders";
    public static final String PREFS = "gs_reminders";
    public static final String KEY_ITEMS = "items";
    private static final String TAG = "NurvanReminder";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            restoreAll(context);
            return;
        }
        ensureChannel(context);
        String title = intent.getStringExtra("reminder_title");
        String body = intent.getStringExtra("reminder_body");
        String id = intent.getStringExtra("reminder_id");
        if (title == null || title.isEmpty()) title = "Promemoria Nurvan";
        if (body == null) body = "Hai un avviso";
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int req = Math.abs(String.valueOf(id).hashCode());
        PendingIntent pi = PendingIntent.getActivity(
                context, req, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pi);
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(req == 0 ? 1 : req, b.build());
        long repeat = intent.getLongExtra("repeat_every_ms", 0L);
        if (repeat > 0) {
            schedule(context, id, title, body, System.currentTimeMillis() + repeat, repeat);
        }
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Avvisi Nurvan", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Terapia, integrazione e alimentazione");
            nm.createNotificationChannel(ch);
        }
    }

    public static void schedule(Context context, String id, String title, String body, long when, long repeatEveryMs) {
        try {
            ensureChannel(context);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(context, ReminderReceiver.class);
            i.putExtra("reminder_title", title);
            i.putExtra("reminder_body", body);
            i.putExtra("reminder_id", id);
            i.putExtra("repeat_every_ms", repeatEveryMs);
            int req = Math.abs(String.valueOf(id).hashCode());
            PendingIntent pi = PendingIntent.getBroadcast(
                    context, req, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (am == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, when, pi);
            }
            persistItem(context, id, title, body, when, repeatEveryMs);
        } catch (Exception error) {
            Log.w(TAG, "schedule failed", error);
        }
    }

    public static void cancel(Context context, String id) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(context, ReminderReceiver.class);
            int req = Math.abs(String.valueOf(id).hashCode());
            PendingIntent pi = PendingIntent.getBroadcast(
                    context, req, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (am != null) am.cancel(pi);
            removeItem(context, id);
        } catch (Exception error) {
            Log.w(TAG, "cancel failed", error);
        }
    }

    static void persistItem(Context context, String id, String title, String body, long when, long repeat) {
        try {
            SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(sp.getString(KEY_ITEMS, "[]"));
            JSONArray next = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null && !id.equals(o.optString("id"))) next.put(o);
            }
            JSONObject item = new JSONObject();
            item.put("id", id);
            item.put("title", title);
            item.put("body", body);
            item.put("at", when);
            item.put("repeatEveryMs", repeat);
            next.put(item);
            sp.edit().putString(KEY_ITEMS, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    static void removeItem(Context context, String id) {
        try {
            SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(sp.getString(KEY_ITEMS, "[]"));
            JSONArray next = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o != null && !id.equals(o.optString("id"))) next.put(o);
            }
            sp.edit().putString(KEY_ITEMS, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static void notifyNow(Context context, String id, String title, String body) {
        notifyNow(context, id, title, body, null);
    }

    public static void notifyNow(Context context, String id, String title, String body, String routeJson) {
        ensureChannel(context);
        if (title == null || title.isEmpty()) title = "Nurvan";
        if (body == null) body = "";
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (routeJson != null && !routeJson.isEmpty()) {
            open.putExtra("nurvan_route", routeJson);
        }
        int req = Math.abs(String.valueOf(id != null ? id : title).hashCode());
        PendingIntent pi = PendingIntent.getActivity(
                context, req, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pi);
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(req == 0 ? 1 : req, b.build());
    }

    public static void restoreAll(Context context) {
        try {
            SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(sp.getString(KEY_ITEMS, "[]"));
            long now = System.currentTimeMillis();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                long when = o.optLong("at", now + 60_000L);
                long repeat = o.optLong("repeatEveryMs", 0L);
                while (repeat > 0 && when <= now) when += repeat;
                if (when <= now) when = now + 30_000L;
                schedule(context, o.optString("id"), o.optString("title"), o.optString("body"), when, repeat);
            }
        } catch (Exception error) {
            Log.w(TAG, "restore failed", error);
        }
    }
}
