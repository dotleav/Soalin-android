package com.dotleav.soalin.regular

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Menangani tombol unduh dan "Lain kali" di notifikasi update, serta hasil unduhan (verifikasi SHA-256). */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            UpdateChecker.ACTION_DOWNLOAD -> UpdateChecker.download(context)
            UpdateChecker.ACTION_LATER -> UpdateChecker.later(context)
            DownloadManager.ACTION_DOWNLOAD_COMPLETE ->
                UpdateChecker.verifyDownload(context, intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L))
        }
    }
}
