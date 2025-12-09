package com.anonymous.testefinalbible

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.TimeUnit

class VerseOfDayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Inicia o WorkManager para atualizações periódicas
        startPeriodicWork(context)
        
        // Atualiza todos os widgets
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Quando o primeiro widget é adicionado, inicia o WorkManager
        startPeriodicWork(context)
    }

    override fun onDisabled(context: Context) {
        // Quando o último widget é removido, cancela o WorkManager
        WorkManager.getInstance(context).cancelUniqueWork(DevotionalWorker.WORK_NAME)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        // Atualiza quando recebe ação de atualização manual
        if (intent.action == ACTION_UPDATE_WIDGET) {
            // Dispara o Worker imediatamente
            val workRequest = androidx.work.OneTimeWorkRequestBuilder<DevotionalWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            
            WorkManager.getInstance(context).enqueue(workRequest)
            
            // Atualiza o widget com dados em cache enquanto busca novos
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, VerseOfDayWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    companion object {
        private const val ACTION_UPDATE_WIDGET = "com.anonymous.testefinalbible.UPDATE_WIDGET"
        
        /**
         * Inicia o WorkManager para atualizações periódicas
         * Atualiza a cada 1 hora (mínimo permitido pelo Android é 15 minutos)
         */
        private fun startPeriodicWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicWorkRequest = PeriodicWorkRequestBuilder<DevotionalWorker>(
                1, TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                DevotionalWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicWorkRequest
            )
        }
        
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Cria intent para abrir o app quando clicar no widget
            val intent = Intent(context, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Lê os dados salvos pelo Worker
            val prefs: SharedPreferences = context.getSharedPreferences(
                DevotionalWorker.WIDGET_PREFS_NAME,
                Context.MODE_PRIVATE
            )
            
            val reference = prefs.getString(DevotionalWorker.PREF_REFERENCE, "") ?: ""
            val verse = prefs.getString(DevotionalWorker.PREF_VERSE, "") ?: ""
            val date = prefs.getString(DevotionalWorker.PREF_DATE, "") ?: ""

            val views = RemoteViews(context.packageName, R.layout.widget_verse_of_day)
            
            if (reference.isNotEmpty() && verse.isNotEmpty()) {
                // Define os textos
                views.setTextViewText(R.id.widget_reference, reference)
                views.setTextViewText(R.id.widget_verse, verse)
                views.setTextViewText(R.id.widget_title, "Verso do Dia")
                
                // Formata a data se disponível
                if (date.isNotEmpty()) {
                    try {
                        val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                        val outputFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                        val parsedDate = inputFormat.parse(date)
                        if (parsedDate != null) {
                            views.setTextViewText(R.id.widget_date, outputFormat.format(parsedDate))
                        } else {
                            views.setTextViewText(R.id.widget_date, "")
                        }
                    } catch (e: Exception) {
                        views.setTextViewText(R.id.widget_date, "")
                    }
                } else {
                    views.setTextViewText(R.id.widget_date, "")
                }
            } else {
                // Mostra mensagem de carregamento se não houver dados
                views.setTextViewText(R.id.widget_reference, "Carregando...")
                views.setTextViewText(R.id.widget_verse, "Aguarde enquanto buscamos o verso do dia")
                views.setTextViewText(R.id.widget_title, "Verso do Dia")
                views.setTextViewText(R.id.widget_date, "")
            }

            // Define o clique para abrir o app
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            
            // Atualiza o widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
