@echo off
title Terraria WASM Launcher
cd /d "%~dp0"
echo ========================================================
echo   Launching Terraria WASM with Cross-Origin Isolation
echo ========================================================
python serve.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python was not found or encountered an error.
    echo Attempting fallback with Node.js...
    node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve('../..');http.createServer((req,res)=>{const p=path.join(root,req.url.split('?')[0]);if(!fs.existsSync(p)){res.writeHead(404);return res.end();}const stat=fs.statSync(p);const file=stat.isDirectory()?path.join(p,'index.html'):p;const ext=path.extname(file);const m={'.html':'text/html','.js':'application/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf','.dat':'application/octet-stream'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':m,'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});fs.createReadStream(file).pipe(res);}).listen(8080,()=>{console.log('Serving on http://localhost:8080/games/terraria/index.html');require('child_process').exec('start http://localhost:8080/games/terraria/index.html');});"
)
pause
