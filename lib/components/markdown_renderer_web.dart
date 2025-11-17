import 'dart:js_interop';
import 'dart:js_interop_unsafe';

/// 在 Web 平台上執行語法高亮
void highlightCode() {
  globalContext.callMethod(
    'eval'.toJS,
    'if (typeof hljs !== "undefined") { hljs.highlightAll(); }'.toJS,
  );
}
