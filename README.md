# 抖小短剧本地编码脚本

** 该项目使用 yarn 管理 node_modules **

** 使用文档如下：https://bytedance.larkoffice.com/docx/FfgsdbTgJowcW7xngVoczpDOnbc **

```sh
yarn # 安装依赖
node index.js # 执行脚本
```

## 开发注意点

1. 本地安装ffmpeg；
2. 安装node环境；
3. 执行脚本；
4. 如果不使用node环境，可以自主实现调用脚本，执行以下ffmpeg命令，替换命令中的input_file为输入的文件名，output.mp4为输出的文件名；
```sh
ffmpeg -i input_file -vf scale=-2:720 -vcodec libx264 -preset slow -crf 27 -maxrate 2000k -bufsize 4000k -r 25 -acodec aac -b:a 128000 -ar 44100 -ac 2 -y -f mp4 -max_muxing_queue_size 9999 -movflags +faststart output.mp4
```

