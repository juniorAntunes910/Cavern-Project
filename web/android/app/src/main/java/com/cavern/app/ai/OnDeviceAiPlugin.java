package com.cavern.app.ai;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "OnDeviceAi")
public class OnDeviceAiPlugin extends Plugin {
    private GenerativeModelFutures model;

    private GenerativeModelFutures model() {
        if (model == null) model = GenerativeModelFutures.from(Generation.INSTANCE.getClient());
        return model;
    }

    private Executor mainExecutor() {
        return ContextCompat.getMainExecutor(getContext());
    }

    private Exception asException(Throwable error) {
        return error instanceof Exception ? (Exception) error : new Exception(error);
    }

    @PluginMethod
    public void status(PluginCall call) {
        Futures.addCallback(model().checkStatus(), new FutureCallback<Integer>() {
            @Override public void onSuccess(Integer status) {
                String value = status == FeatureStatus.AVAILABLE ? "available"
                    : status == FeatureStatus.DOWNLOADABLE ? "downloadable"
                    : status == FeatureStatus.DOWNLOADING ? "downloading" : "unavailable";
                JSObject result = new JSObject();
                result.put("status", value);
                call.resolve(result);
            }
            @Override public void onFailure(@NonNull Throwable error) {
                call.reject("Não foi possível verificar o modelo local.", asException(error));
            }
        }, mainExecutor());
    }

    @PluginMethod
    public void download(PluginCall call) {
        model().download(new DownloadCallback() {
            @Override public void onDownloadStarted(long totalBytesToDownload) { }
            @Override public void onDownloadProgress(long totalBytesDownloaded) { }
            @Override public void onDownloadCompleted() { call.resolve(); }
            @Override public void onDownloadFailed(@NonNull GenAiException error) {
                call.reject("O modelo local não pôde ser baixado.", error);
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        if (prompt.trim().isEmpty() || prompt.length() > 12000) {
            call.reject("O texto para análise está vazio ou excede o limite.");
            return;
        }
        Futures.addCallback(model().checkStatus(), new FutureCallback<Integer>() {
            @Override public void onSuccess(Integer status) {
                if (status != FeatureStatus.AVAILABLE) {
                    call.reject("O modelo generativo local não está disponível neste aparelho.");
                    return;
                }
                Futures.addCallback(model().generateContent(prompt), new FutureCallback<com.google.mlkit.genai.prompt.GenerateContentResponse>() {
                    @Override public void onSuccess(com.google.mlkit.genai.prompt.GenerateContentResponse response) {
                        String text = response.getCandidates().isEmpty() ? "" : response.getCandidates().get(0).getText();
                        if (text == null || text.isBlank()) call.reject("O modelo local não retornou uma resposta.");
                        else { JSObject result = new JSObject(); result.put("text", text); call.resolve(result); }
                    }
                    @Override public void onFailure(@NonNull Throwable error) {
                        call.reject("A análise generativa local falhou.", asException(error));
                    }
                }, mainExecutor());
            }
            @Override public void onFailure(@NonNull Throwable error) {
                call.reject("Não foi possível iniciar a análise local.", asException(error));
            }
        }, mainExecutor());
    }
}
