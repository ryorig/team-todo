import AppKit
import SwiftUI
import WebKit

private let appURL = URL(string: "https://team-todo-drab.vercel.app/")!

@main
struct TeamTodoWidgetApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("チームToDo") {
            WebView(url: appURL)
                .frame(minWidth: 300, idealWidth: 360, minHeight: 360, idealHeight: 560)
        }
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("チームToDoについて") { }
            }
            CommandGroup(after: .windowArrangement) {
                Button("常に手前に表示") {
                    appDelegate.toggleAlwaysOnTop()
                }
                .keyboardShortcut("T", modifiers: [.command, .option])
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private(set) var alwaysOnTop = true

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        DispatchQueue.main.async { [weak self] in
            self?.configureWindows()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func toggleAlwaysOnTop() {
        alwaysOnTop.toggle()
        configureWindows()
    }

    private func configureWindows() {
        for window in NSApp.windows where window.contentView != nil {
            window.level = alwaysOnTop ? .floating : .normal
            window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            window.titleVisibility = .hidden
            window.titlebarAppearsTransparent = true
            window.isMovableByWindowBackground = true
            window.backgroundColor = .clear
            window.isOpaque = false
            window.standardWindowButton(.zoomButton)?.isHidden = true
            window.setFrameAutosaveName("TeamTodoWidget")
        }
    }
}

struct WebView: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.allowsBackForwardNavigationGestures = true
        view.setValue(false, forKey: "drawsBackground")
        view.load(URLRequest(url: url, cachePolicy: .useProtocolCachePolicy))
        return view
    }

    func updateNSView(_ webView: WKWebView, context: Context) { }
}
