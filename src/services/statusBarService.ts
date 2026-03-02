import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function StatusBarInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.classList.add("native");
    void StatusBar.setOverlaysWebView({ overlay: false });
    void StatusBar.setStyle({ style: Style.Dark });
    void StatusBar.setBackgroundColor({ color: "#0f1117" });
  }, []);

  return null;
}
