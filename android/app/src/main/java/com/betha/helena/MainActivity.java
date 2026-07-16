package com.betha.helena;

import android.os.Bundle;

import com.betha.helena.notifications.HelenaNotifications;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HelenaNotifications.class);
        super.onCreate(savedInstanceState);
    }
}
