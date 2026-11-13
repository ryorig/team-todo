# Team ToDo Widget for macOS

Web版のチームToDoを、デスクトップ上に常に手前表示する小型ウィンドウとして起動します。

## 起動

```sh
cd mac-widget
./build-app.sh
open "Team ToDo Widget.app"
```

初回ログイン後は、WKWebViewのブラウザデータにログイン状態が保存されます。
ウィンドウは全デスクトップで表示され、ドラッグで移動・端をドラッグしてサイズ変更できます。

「常に手前に表示」は `⌥⌘T` で切り替えられます。
