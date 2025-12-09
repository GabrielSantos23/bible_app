package com.anonymous.testefinalbible

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Worker que busca o devocional do dia e atualiza o widget
 * Usa corrotinas para operações assíncronas
 */
class DevotionalWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            // Obtém a URL do Convex
            val convexUrl = getConvexUrl()
            
            // Busca os dados do devocional
            val devotionalData = fetchDevotional(convexUrl)
            
            if (devotionalData != null) {
                // Salva os dados em SharedPreferences para o widget acessar
                saveDevotionalData(devotionalData)
                
                // Atualiza o widget
                updateWidget(devotionalData)
                
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }

    private fun getConvexUrl(): String {
        // Tenta ler de strings.xml primeiro
        val urlFromStrings = try {
            applicationContext.getString(R.string.convex_widget_url)
        } catch (e: Exception) {
            ""
        }
        if (urlFromStrings.isNotEmpty() && urlFromStrings != "YOUR_CONVEX_URL") {
            return urlFromStrings
        }
        // Fallback: URL padrão (você deve configurar isso)
        return "https://your-project.convex.site/widget/devotional?language=pt"
    }

    private suspend fun fetchDevotional(url: String): DevotionalData? = withContext(Dispatchers.IO) {
        try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.connect()

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val inputStream: InputStream = connection.inputStream
                val response = inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(response)

                // Tenta obter o verso de diferentes campos
                val verse = when {
                    json.has("verse") && !json.isNull("verse") -> json.getString("verse")
                    json.has("rawData") && !json.isNull("rawData") -> {
                        val rawData = json.getJSONObject("rawData")
                        rawData.optString("text", rawData.optString("verse", ""))
                    }
                    else -> ""
                }

                DevotionalData(
                    reference = json.optString("reference", ""),
                    verse = verse,
                    date = json.optString("date", "")
                )
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun saveDevotionalData(data: DevotionalData) {
        val prefs: SharedPreferences = applicationContext.getSharedPreferences(
            WIDGET_PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().apply {
            putString(PREF_REFERENCE, data.reference)
            putString(PREF_VERSE, data.verse)
            putString(PREF_DATE, data.date)
            commit() // Usa commit() para garantir que os dados sejam salvos imediatamente
        }
    }

    private fun updateWidget(data: DevotionalData) {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val componentName = ComponentName(applicationContext, VerseOfDayWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        // Atualiza todos os widgets
        for (appWidgetId in appWidgetIds) {
            VerseOfDayWidgetProvider.updateAppWidget(
                applicationContext,
                appWidgetManager,
                appWidgetId
            )
        }
    }

    private data class DevotionalData(
        val reference: String,
        val verse: String,
        val date: String
    )

    companion object {
        const val WIDGET_PREFS_NAME = "verse_of_day_widget_prefs"
        const val PREF_REFERENCE = "reference"
        const val PREF_VERSE = "verse"
        const val PREF_DATE = "date"
        const val WORK_NAME = "devotional_update_work"
    }
}

