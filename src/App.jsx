import './App.css'
import { APPID, APPKEY, DEV_PID, URI } from './constant'


/*
1. 连接 ws_app.run_forever()
2. 连接成功后发送数据 on_open()
2.1 发送开始参数帧 send_start_params()
2.2 发送音频数据帧 send_audio()
2.3 库接收识别结果 on_message()
2.4 发送结束帧 send_finish()
3. 关闭连接 on_close()

库的报错 on_error()
*/

const uri = "ws://vop.baidu.com/realtime_asr" + '?sn=' + crypto.randomUUID();

let ws;
let recorder;

/**
 * 开始参数帧
 */
const sendStartParams = () => {
  let req = {
    'type': 'START',
    'data': {
      'appid': APPID,  // 网页上的appid
      'appkey': APPKEY,  // 网页上的appid对应的appkey
      'dev_pid': DEV_PID,  // 识别模型
      'cuid': 'dadavgsggfdhhfg',  // 随便填不影响使用。机器的mac或者其它唯一id，百度计算UV用。
      'sample': 16000,  // 固定参数
      'format': 'pcm'  // 固定参数
    }
  };
  let body = JSON.stringify(req);
  ws.send(body);
  console.log('send START frame with params:' + body);
};

/**
 * 发送结束帧
 */
const sendFinish = () => {
  let req = {
    'type': 'FINISH'
  };
  let body = JSON.stringify(req);
  ws.send(body);
  console.log('send FINISH frame');
};


const connectWebSocket = () => {
  ws = new WebSocket(uri);
  ws.onopen = () => {
    sendStartParams();
    console.log('WebSocket start.')
  };

  ws.onmessage = (message) => {
    // console.log(message)
    solveMessage(message)
  };

  ws.onclose = () => {
    console.log('WebSocket is closed now.');
  };

  ws.onerror = (error) => {
    recorder.stop();
    console.log('error:', error)
  };
};

let conversations = []
let last_reply

async function solveMessage(jsonString) {
  const data = JSON.parse(jsonString.data);
  // const data = JSON.parse(jsonObject.data);
  if (data.type != "FIN_TEXT") {
    return
  }
  conversations.push(data.result)

  // 只保留最近20条对话
  while (conversations.length > 20) {
    conversations.shift();
  }
  console.log("Question:" + data.result)

  // 要发送的数据
  let req = {
    last_reply: last_reply,
    conversations: conversations
  };

  //http://localhost:9527/interview/help
  fetch('http://43.139.233.231:9527/interview/help', {
    method: 'POST', // or 'PUT'
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),  // 将数据转换为 JSON 字符串
  })
    .then(response => response.json())  // 解析 JSON 响应
    .then(resp => {
      console.log('Answer:', resp.reply);
      if (resp.reply != "No reply required") {
        last_reply = resp.reply
      }
      // TODO 渲染前端页面
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function App() {
  recorder = new RecorderManager("/src/recorder_manager");
  recorder.onStart = () => {
    // console.log("recorder.onStart")
  }
  recorder.onStop = function () {
    sendFinish();
    console.log('thread terminating');
  };
  // 接收音频数据帧
  recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
    // console.log("onFrameRecorded")
    if (ws.readyState === ws.OPEN) {
      ws.send(new Int8Array(frameBuffer));
      if (isLastFrame) {
        // ws.send('{"end": true}');
        console.log("is last frame")
      }
    }
  };
  // 定义每帧大小
  let frameSize = 16000 * 2 / 1000 * 160;
  function startRecording() {
    // 建连
    connectWebSocket();
    // 开始录音
    recorder.start({
      sampleRate: 16000,
      frameSize: frameSize,
    });
  }

  // 停止录音
  function stopRecording() {
    recorder.stop();
  }
  return (
    <div>
      <button onClick={startRecording}>打开麦克风录音</button>
      <button onClick={stopRecording}>停止麦克风录音</button>
    </div>
  )
}

export default App
