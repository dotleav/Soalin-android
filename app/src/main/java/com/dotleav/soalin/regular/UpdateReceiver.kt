package com.dotleav.soalin.regular

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Menangani tombol unduh dan "Lain kali" di notifikasi update. */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            UpdateChecker.ACTION_DOWNLOAD -> UpdateChecker.download(context)
            UpdateChecker.ACTION_LATER -> UpdateChecker.later(context)
        }
    }
}
