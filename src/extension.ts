import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  // 注册命令，触发提取 SVG 链接并展示 Webview
  let disposable = vscode.commands.registerCommand(
    "view-svg.previewSVG",
    async () => {
      // 获取当前打开的文件路径
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const filePath = editor.document.uri.fsPath;

      // 确保文件是 TypeScript 文件并且路径是正确的
      if (!filePath.endsWith(".ts") && !filePath.endsWith(".js")) {
        vscode.window.showInformationMessage(
          "Please open a TypeScript or JavaScript file containing the SVG object."
        );
        return;
      }

      try {
        // 读取并解析文件，获取默认导出的对象
        const svgMap = getSvgMapFromFile(filePath);

        // 在 Webview 中展示 SVG 链接
        const panel = vscode.window.createWebviewPanel(
          "svgPreview", // Webview 类型
          "SVG Preview", // Webview 标题
          vscode.ViewColumn.One, // 打开位置
          {} // 配置
        );

        // 设置 Webview 内容
        panel.webview.html = getAllSVGsWebviewContent(svgMap);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error reading SVG map: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

// 从文件中读取 export default 导出的对象
function getSvgMapFromFile(filePath: string): Record<string, string> {
  // 读取文件内容
  const fileContent = fs.readFileSync(filePath, "utf-8");

  // 正则匹配 export default 后的对象，无论是否有命名
  const regex = /export\s+default\s+({[\s\S]*?});?/;
  const match = regex.exec(fileContent);
  if (!match) {
    throw new Error("No object found exported as default in the file.");
  }

  // 提取对象内容并返回
  const svgMapContent = match[1];

  // 使用 new Function 将对象解析为 JavaScript 对象
  const svgMap = new Function("return " + svgMapContent)();

  return svgMap;
}

// 生成 Webview 内容的 HTML
function getAllSVGsWebviewContent(svgMap: Record<string, string>): string {
  const items = Object.entries(svgMap)
    .map(
      ([name, url]) => `
          <div class="svg-item">
              <img src="${
                url.startsWith("//") ? `https:${url}` : url
              }" alt="${name}" />
              <p class="svg-name" data-name="${name}">${name}</p>
          </div>
      `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SVG Preview</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              padding: 20px;
              background-color: #f3f3f3;
          }
          .svg-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              gap: 20px;
              width: 100%;
          }
          .svg-item {
              text-align: center;
              padding: 10px;
              background: #fff;
              border: 1px solid #ddd;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .svg-item img {
              max-width: 100%;
              max-height: 100px;
          }
          .svg-item p {
              margin: 10px 0 0;
              font-size: 14px;
              color: #333;
              cursor: pointer;
          }
      </style>
  </head>
  <body>
      <h1>SVG Preview</h1>
      <div class="svg-container">
          ${items}
      </div>

  </body>
  </html>
  `;
}

// 扩展停用时的清理
export function deactivate() {}
