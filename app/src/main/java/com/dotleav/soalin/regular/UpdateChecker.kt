package com.dotleav.soalin.regular

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.widget.RemoteViews
import android.widget.Toast
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
 * Kalau versionCode di repo lebih tinggi dari yang terpasang, muncul notifikasi
 * dengan tombol unduh (APK disimpan ke folder Download) dan tombol "Lain kali".
 * Dicek paling sering sekali per 6 jam; gagal diam-diam kalau offline.
 */
object UpdateChecker {
    const val REQ_NOTIF = 4102
    const val REQ_STORAGE = 4103
    const val ACTION_DOWNLOAD = "com.dotleav.soalin.regular.UPDATE_DOWNLOAD"
    const val ACTION_LATER = "com.dotleav.soalin.regular.UPDATE_LATER"

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

    /**
     * Tampilkan notifikasi untuk update yang tertunda.
     * Muncul sekali per versi, kecuali setelah "Lain kali" (lihat later()).
     */
    fun notifyIfPending(activity: Activity) {
        val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val remoteCode = prefs.getInt("remote_code", 0)
        if (remoteCode <= BuildConfig.VERSION_CODE) return
        if (prefs.getInt("notified_code", 0) == remoteCode) return

        if (Build.VERSION.SDK_INT >= 33 && !granted(activity, Manifest.permission.POST_NOTIFICATIONS)) {
            // Minta izin sekali per versi; kalau ditolak, tidak diminta lagi sampai versi baru.
            if (!prefs.getBoolean("asked_notif_$remoteCode", false)) {
                prefs.edit().putBoolean("asked_notif_$remoteCode", true).apply()
                ActivityCompat.requestPermissions(
                    activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIF
                )
            }
            return
        }

        // Android 7–9 butuh izin storage supaya APK bisa masuk folder Download.
        // Notifikasi tetap muncul walau izin ditolak; unduhan lalu masuk folder aplikasi.
        if (Build.VERSION.SDK_INT < 29 &&
            !granted(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE) &&
            !prefs.getBoolean("asked_storage_$remoteCode", false)
        ) {
            prefs.edit().putBoolean("asked_storage_$remoteCode", true).apply()
            ActivityCompat.requestPermissions(
                activity, arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), REQ_STORAGE
            )
        }

        post(activity, prefs.getString("remote_name", "") ?: "")
        prefs.edit().putInt("notified_code", remoteCode).apply()
    }

    /** Tombol unduh di notifikasi: simpan APK dari repo ke folder Download. */
    fun download(ctx: Context) {
        val name = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("remote_name", "") ?: ""
        val fileName = "Soalin-v$name.apk"
        val req = DownloadManager.Request(Uri.parse(APK_URL))
            .setTitle("Soalin v$name")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        if (Build.VERSION.SDK_INT >= 29 || granted(ctx, Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
        } else {
            req.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, fileName)
            Toast.makeText(ctx, R.string.update_no_storage, Toast.LENGTH_LONG).show()
        }
        (ctx.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
        NotificationManagerCompat.from(ctx).cancel(NOTIF_ID)
    }

    /**
     * Tombol "Lain kali": tutup notifikasi sekarang, lalu munculkan lagi
     * di pembukaan app berikutnya (notified_code di-reset ke 0).
     */
    fun later(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putInt("notified_code", 0)
            .apply()
        NotificationManagerCompat.from(ctx).cancel(NOTIF_ID)
    }

    private fun granted(ctx: Context, permission: String) =
        ContextCompat.checkSelfPermission(ctx, permission) == PackageManager.PERMISSION_GRANTED

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
        // Baris: [⬇] v1.7 [Lain kali]. Versi diisi dari repo setiap pengecekan.
        val views = RemoteViews(ctx.packageName, R.layout.notif_update).apply {
            setTextViewText(R.id.update_version, ctx.getString(R.string.update_version, versionName))
            setOnClickPendingIntent(R.id.update_download, actionIntent(ctx, ACTION_DOWNLOAD, 1))
            setOnClickPendingIntent(R.id.update_later, actionIntent(ctx, ACTION_LATER, 2))
        }
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(ctx.getString(R.string.update_title))
            .setContentText(ctx.getString(R.string.update_text, versionName))
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(views)
            .setContentIntent(actionIntent(ctx, ACTION_DOWNLOAD, 0))
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(NOTIF_ID, n)
    }

    private fun actionIntent(ctx: Context, action: String, requestCode: Int): PendingIntent =
        PendingIntent.getBroadcast(
            ctx,
            requestCode,
            Intent(ctx, UpdateReceiver::class.java).setAction(action),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
}
