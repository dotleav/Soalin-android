package com.dotleav.soalin.regular

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Mengecek APK terbaru yang di-commit di repo (app/release/output-metadata.json).
 * Kalau versionCode di repo lebih tinggi dari yang terpasang, muncul notifikasi.
 * Dicek paling sering sekali per 6 jam; gagal diam-diam kalau offline.
 */
object UpdateChecker {
    const val REQ_NOTIF = 4102

    private const val META_URL =
        "https://raw.githubusercontent.com/dotleav/Soalin-android/master/app/release/output-metadata.json"
    private const val APK_URL =
        "https://github.com/dotleav/Soalin-android/raw/master/app/release/app-release.apk"
    private const val CHANNEL_ID = "soalin_update"
    private const val NOTIF_ID = 4101
    private const val PREFS = "soalin_update"
    private const val INTERVAL_MS = 6L * 60 * 60 * 1000

    private val worker = Executors.newSingleThreadExecutor()

    /** Dipanggil dari MainActivity.onCreate. */
    fun check(activity: Activity) {
        val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val last = prefs.getLong("last_check", 0L)
        if (System.currentTimeMillis() - last < INTERVAL_MS) {
            notifyIfPending(activity)
            return
        }
        worker.execute {
            try {
                val remote = fetchRemote()
                prefs.edit()
                    .putLong("last_check", System.currentTimeMillis())
                    .putInt("remote_code", remote.first)
                    .putString("remote_name", remote.second)
                    .apply()
            } catch (e: Exception) {
                return@execute // offline atau repo tidak bisa diakses: coba lagi nanti
            }
            activity.runOnUiThread { notifyIfPending(activity) }
        }
    }

    private fun fetchRemote(): Pair<Int, String> {
        val conn = URL(META_URL).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val el = JSONObject(body).getJSONArray("elements").getJSONObject(0)
            return Pair(el.getInt("versionCode"), el.getString("versionName"))
        } finally {
            conn.disconnect()
        }
    }

    /** Tampilkan notifikasi untuk update yang tertunda, sekali per versi. */
    fun notifyIfPending(activity: Activity) {
        val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val remoteCode = prefs.getInt("remote_code", 0)
        if (remoteCode <= BuildConfig.VERSION_CODE) return
        if (prefs.getInt("notified_code", 0) == remoteCode) return

        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            // Minta izin sekali per versi; kalau ditolak, tidak diminta lagi sampai versi baru.
            if (!prefs.getBoolean("asked_notif_$remoteCode", false)) {
                prefs.edit().putBoolean("asked_notif_$remoteCode", true).apply()
                ActivityCompat.requestPermissions(
                    activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF
                )
            }
            return
        }
        post(activity, prefs.getString("remote_name", "") ?: "")
        prefs.edit().putInt("notified_code", remoteCode).apply()
    }

    @SuppressLint("MissingPermission")
    private fun post(ctx: Context, versionName: String) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    ctx.getString(R.string.update_channel),
                    NotificationManager.IMPORTANCE_DEFAULT
                )
            )
        }
        val open = PendingIntent.getActivity(
            ctx,
            0,
            Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(ctx.getString(R.string.update_title))
            .setContentText(ctx.getString(R.string.update_text, versionName))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(NOTIF_ID, n)
    }
}
