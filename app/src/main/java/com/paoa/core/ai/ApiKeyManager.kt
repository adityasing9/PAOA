package com.paoa.core.ai

import android.content.Context
import android.content.SharedPreferences

class ApiKeyManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getGeminiApiKey(): String? {
        val key = prefs.getString(KEY_GEMINI_API_KEY, null)?.trim()
        return if (key.isNullOrBlank()) null else key
    }

    fun setGeminiApiKey(key: String?) {
        prefs.edit().apply {
            if (key.isNullOrBlank()) {
                remove(KEY_GEMINI_API_KEY)
            } else {
                putString(KEY_GEMINI_API_KEY, key.trim())
            }
            apply()
        }
    }

    fun isGeminiEnabled(): Boolean {
        return !getGeminiApiKey().isNullOrBlank()
    }

    companion object {
        private const val PREFS_NAME = "paoa_ai_prefs"
        private const val KEY_GEMINI_API_KEY = "gemini_api_key"
    }
}
