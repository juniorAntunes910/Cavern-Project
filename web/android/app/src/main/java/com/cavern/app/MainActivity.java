package com.cavern.app;

import com.getcapacitor.BridgeActivity;
import com.cavern.app.ai.OnDeviceAiPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OnDeviceAiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
