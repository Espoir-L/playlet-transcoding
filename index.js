const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { SingleBar } = require('cli-progress');
const log4js = require('log4js');

const logsFile = 'logs/app.log';
const inputDir = 'resource';
const outputDir = 'output';
const errorDir = 'error';
// TODO: 可根据需要添加其他视频文件扩展名
const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', 'm3u8'];


function createDirectorySync(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    // console.log(`目录 ${directory} 创建成功`);
  } else {
    // console.log(`目录 ${directory} 已存在`);
  }
}


// 提取视频文件名（不包含格式后缀）
const extractFileName = (filePath) => {
  const extension = path.extname(filePath);
  const fileName = path.basename(filePath, extension);
  const directory = path.dirname(filePath);
  const newPath = path.join(directory, fileName);
  return newPath;
};

// 检查文件是否为视频文件
function isVideoFile(fileName) {
  const extension = path.extname(fileName);
  return videoExtensions.includes(extension.toLowerCase());
}

const filesArr = [];

// 递归遍历目录并获取所有文件的总数
function recursiveFiles(directory) {
  let count = 0;
  const contents = fs.readdirSync(directory);
  contents.forEach((files) => {
    const filesPath = path.join(directory, files);
    const stats = fs.statSync(filesPath);
    if (stats.isFile() && isVideoFile(files)) {
      count++;
      filesArr.push(filesPath)
    } else if (stats.isDirectory()) {
      count += recursiveFiles(filesPath);
      const outputPath = filesPath.replace(inputDir, outputDir);
      createDirectorySync(outputPath);
      const errorPath = filesPath.replace(inputDir, errorDir);
      createDirectorySync(errorPath);
    }
  });

  return count;
}

const progressBar = new SingleBar({
  format: '进度 |{bar}| {percentage}% | 当前进度: {value}/{total} | 估计剩余时间: {eta}s',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
});

// 执行 ffmpeg 命令处理文件
function ffmpegFile(filePath) {
  return new Promise((resolve, reject) => {
    const transformedFileName = filePath.replace('resource', 'output');
    const fileName = extractFileName(transformedFileName);
    const outputPath = `${fileName}.mp4`;
    const ffmpegCommand = `ffmpeg -i ${filePath} -vf scale=-2:720 -vcodec libx264 -preset slow -crf 27 -maxrate 2000k -bufsize 4000k -r 25 -acodec aac -b:a 128000 -ar 44100 -ac 2 -y -f mp4 -max_muxing_queue_size 9999 -movflags +faststart ${outputPath}`;

    const ffmpegProcess = exec(ffmpegCommand);

    ffmpegProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errmsg = `[${filePath}]: FFMPEG command failed with exit code ${code}`;
        logger.error(errmsg);
        reject(new Error(errmsg));
      }
    });
  });
}

const main = async () => {
  log4js.configure({
    appenders: {
      file: { type: 'file', filename: logsFile },
      console: { type: 'console' }
    },
    categories: {
      default: { appenders: ['file', 'console'], level: 'debug' }
    }
  });
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
    console.log(`目录 ${inputDir} 创建成功，请将需要转码的视频文件放到该目录下`);
    return;
  }

  createDirectorySync(outputDir);
  createDirectorySync(errorDir);


  console.log('开始遍历需要转码的文件');
  const totalFilesCount = recursiveFiles(inputDir, 'count');
  let completedFiles = 0;

  if (totalFilesCount === 0) {
    console.log(`请将需要转码的视频文件放到该目录下`);
    return;
  }

  console.log(`当前有${totalFilesCount}个文件需要转码`);
  const totalTime = totalFilesCount * 4 > 60
    ? `预计需要${((totalFilesCount * 4) / 60).toFixed(2)}min`
    : `预计需要${(totalFilesCount * 4)}s`;
  console.log(`${totalTime}`);
  console.log('--------\n');
  console.log('开始转码喽~~~\n');

  progressBar.start(totalFilesCount, completedFiles);

  for (const filePath of filesArr) {
    try {
      await ffmpegFile(filePath);
      completedFiles++;
      progressBar.update(completedFiles);
    } catch (error) {
      fs.writeFile(filePath);
    } finally {
      if (completedFiles === totalFilesCount) {
        progressBar.stop();
        console.log('\n恭喜小可爱，转码结束喽~~~');
      }
    }
  }
};

main();
