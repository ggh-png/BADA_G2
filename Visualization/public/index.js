
var data;
var time;
var sig_name;
var viewtime;
var PrintHistory= " ... ";

var hidx=0;
const FRAMES_PER_SECOND = 10;  // Valid values are 60,30,20,15,10...
const FRAME_MIN_TIME = (1000 / 60) * (60 / FRAMES_PER_SECOND) - (1000 / 60) * 0.5;
var lastFrameTime = 0;  // the last frame time
const dic1={'Cry':'아기 우는 소리', 'Alarm':'화재 경보', 'Door':'노크', 'Boiling':'물 끓는 소리', 'Silence':'조용한', 'Water':'물소리', 'Bell':'초인종 소리', 'undefined':"..."};

var canvas;
var ctx;
var start;
var oldTimeStamp;
var x;
var y;
var theta;
var str;
var data;
var time;
var sig_name;
var viewtime;
var PrintHistory = "Connection";

const today = new Date();
today.setTime(0);


function printNow() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
    
  const date = today.getDate();
  let hour = today.getHours();
  let minute = today.getMinutes();
  let second = today.getSeconds();
  const ampm = hour >= 12 ? '오후' : '오전';
  
    // 12시간제로 변경
  hour %= 12;
  hour = hour || 12; // 0 => 12
  
    // 10미만인 분과 초를 2자리로 변경
  minute = minute < 10 ? '0' + minute : minute;
  second = second < 10 ? '0' + second : second;
  
  var now = '${year}.${month}.${date} ${ampm} ${hour}:${minute}:${second}';
  return now;
};

function Queue(){
    this.dataStore = [];
    this.enqueue = enqueue;
    this.dequeue = dequeue;
    this.search=search;
    this.toString=toString;
}

function enqueue(element)
{
    this.dataStore.push(element);
}

function dequeue()
{   
    return this.dataStore.shift();
}

var cnt=0;
function search(){
    
    for(var i=0; i<this.dataStore.length;i++)
    {
      if((this.dataStore[i]-time)>1800000) //30분 이상이면 반복문탈출
      {
        break;
      }
      else{
        cnt++;
        console.log("Water events occur" + cnt + "times");
      }
    }
    if(cnt>=3)
    { console.log("Water event exceed 3 times. Send Message");
      return true;
    }
    else{
      return false;
    }
  }
  
  function toString() {
    var retStr = "";
    for (var i = this.dataStore.length-1;i >=0; i-- )    {
        retStr +="  "+ this.dataStore[i]+"\n";
    }
    retStr = retStr.replace(/(?:\r\n|\r|\n)/g, '<br />');
    return retStr;
}

var water= new Queue();
var h_element;
var h = new Queue();

var hsignal = new ROSLIB.Topic({
  ros : ros,
  name : '/signal',
  messageType : 'std_msgs/String'
});

hsignal.subscribe(function(m){
  sig_name=dic1[m.data];
  console.log("NOW SIGNAL : " + sig_name);
  time=today.getTime();
  viewtime=printNow();

  if(h.dataStore.length>=17) h.dequeue();
  if(sig_name==dic1['Water'])
    {
      if(water.search())
      { 
        for(var i=1; i<=3; i++) water.dequeue();
        cnt=0;
        h.enqueue([sig_name, viewtime]);
        hidx=hidx+1;     
        PrintHistory=h.toString();
      }
      else
      {
       //발생한적없다면
       water.enqueue(time);
      }
    }
    else if(sig_name!=dic1["Silence"])
    {
        // shareKakaotalk(sig_name);
        h.enqueue([sig_name, viewtime]);
        hidx=hidx+1;       
        PrintHistory=h.toString();
    }
    document.getElementById("history").innerHTML=PrintHistory;
});

var listener = new ROSLIB.Topic({
    ros: ros,
    name: '/listener',
    messageType: 'std_msgs/String'
});
   
var ros = new ROSLIB.Ros({
  url: 'ws://localhost:9090'
});
   
var signal = new ROSLIB.Topic({
  ros : ros,
  name : '/signal',
  messageType : 'std_msgs/String'
});
  
signal.subscribe(function(m){
  sig_name=dic1[m.data];
  document.getElementById("signal").innerHTML = sig_name;
});


function Queue(){
    this.dataStore = [];
    this.enqueue = enqueue;
    this.dequeue = dequeue;
    this.search=search;
}

function enqueue(element)
{
    this.dataStore.push(element);
}

function dequeue()
{
    return this.dataStore.shift();
}

var cnt=0;
function search(){
    
    for(var i=0; i<this.dataStore.length;i++)
    {
      if((this.dataStore[i]-time)>1800000) //30분 이상이면 반복문탈출
      {
        break;
      }
      else{
        cnt++;
        console.log("Water events occur" + cnt + "times");
      }
    }
    if(cnt>=3)
    { console.log("Water event exceed 3 times. Send Message");
      return true;
    }
    else{
      return false;
    }
  }

w_remove = setInterval(function() {
    water.dequeue();
}, 600000);

var water= new Queue();
  
  // If there is an error on the backend, an 'error' emit will be emitted.
  ros.on('error', function (error) {
      console.log(error);
  });
  
  // Find out exactly when we made a connection.
  ros.on('connection', function () {
      console.log('Connection made!');
      init();
  });
  
  ros.on('close', function () {
      console.log('Connection closed.');
  });

  var listener = new ROSLIB.Topic({
    ros: ros,
    name: '/listener',
    messageType: 'std_msgs/String'
  });

  var turtle1 = new ROSLIB.Topic({
    ros: ros,
    name: '/turtle1/pose',
    messageType: 'turtlesim/Pose'
  });

  var count = 0;
  turtle1.subscribe(function (message) {
    if (count) {
      console.log(message);
    }
    x = message.x * 50;
    y = message.y * 50;
    theta = message.theta;
  });

  var signal = new ROSLIB.Topic({
    ros : ros,
    name : '/signal',
    messageType : 'std_msgs/String'
  });

  signal.subscribe(function(m){
    sig_name=m.data;
    document.getElementById("signal").innerHTML = sig_name;
    time=today.getTime();


    if(sig_name=='Water')
    {
      //먼저 검색해 
      if(water.search())
      { 
        //총 3번 이상 발생했다면
        for(var i=1; i<=3; i++)
        {
          water.dequeue();
        }
      
        cnt=0;
        // shareKakaotalk(sig_name);
      }
      else
      {
       //발생한적없다면
       water.enqueue(time);
      }
    }
    else if(sig_name!="Silence")
    {
        // shareKakaotalk(sig_name);
    }
  });



function init() {
  canvas = document.getElementById('canvas');
  console.log('initializing canvas and websocket');
  console.log(canvas);
  ctx = canvas.getContext('2d');

  // Start the first frame request
  window.requestAnimationFrame(loop);
  tryConnectWebsocket();
}

function loop(timeStamp) {

  // Keep requesting new frames
  if (timeStamp - lastFrameTime < FRAME_MIN_TIME) { //skip the frame if the call is too early
    window.requestAnimationFrame(loop);
    return; // return as there is nothing to do
  }
  lastFrameTime = timeStamp; // remember the time of the rendered frame

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var secondsPassed = (timeStamp - oldTimeStamp) / 1000;
  var elapsedSeconds = (timeStamp - start) / 1000;
  oldTimeStamp = timeStamp;

  //Calculate fps
  var fps = Math.round(10 / secondsPassed) / 10;

  //Draw number to the screen
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 100);
  ctx.font = '25px Arial';
  ctx.fillStyle = 'black';
  ctx.fillText("FPS: " + fps, 10, 30);

  draw(timeStamp);

  if (elapsedSeconds > 5) {
    return;
  } else {
    window.requestAnimationFrame(loop);
  }
}

function draw(timestamp) {
  
  const radius = 1500;
  const startangle = theta - 1 / 16 * Math.PI;
  const endangle = theta + 1 / 16 * Math.PI;
  ctx.fillStyle = 'rgba(255,100,50,0.3)';

  ctx.beginPath();//ADD THIS LINE!<<<<<<<<<<<<<
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, startangle, endangle);
  ctx.lineTo(x, y);
  ctx.fill(); // or context.fill()

  ctx.beginPath();//ADD THIS 
  ctx.fillStyle = 'red';//#DC143C
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill(); // or context.fill()
}

function init() {
  canvas = document.getElementById('canvas');
  console.log(canvas);
  ctx = canvas.getContext('2d');
  window.requestAnimationFrame(loop);
  tryConnectWebsocket();
};


function tryConnectWebsocket() {

    // Connecting to ROS
    // -----------------
    var ros = new ROSLIB.Ros();
  
    // If there is an error on the backend, an 'error' emit will be emitted.
    ros.on('error', function (error) {
      console.log(error);
    });
  
    
    ros.on('connection', function () {
      console.log('Connection made!');
    });
  
    ros.on('close', function () {
      console.log('Connection closed.');
    });
  
    ros.connect('ws://localhost:9090');
  
    // Like when publishing a topic, we first create a Topic object with details of the topic's name
    // and message type. Note that we can call publish or subscribe on the same topic object.
    var listener = new ROSLIB.Topic({
      ros: ros,
      name: '/listener',
      messageType: 'std_msgs/String'
    });
  
    listener.subscribe(function (message) {
      listener.unsubscribe();
    });
  
    var odom=new ROSLIB.Topic({
      ros:ros,
      name : '/t265/odom/sample/',
      messageType : 'nav_msgs/Odometry'
    });
  
    odom.subscribe(function (message) {
      
      x=message.pose.pose.position.x
      y=message.pose.pose.position.y
      console.log(x,y);
      x=(x*55)+220;
      y=((y*55)+380);
      var quaternion = new THREE.Quaternion(message.pose.pose.orientation.x, message.pose.pose.orientation.y, message.pose.pose.orientation.z, message.pose.pose.orientation.w);
      var euler= new THREE.Euler();
      euler.setFromQuaternion(quaternion,'XYZ');
      theta=euler.z;
    
    });
  };
  
  
  function loop(timeStamp) {
    // Keep requesting new frames
    if (timeStamp - lastFrameTime < FRAME_MIN_TIME) { //skip the frame if the call is too early
      window.requestAnimationFrame(loop);
      return; // return as there is nothing to do
    }
    lastFrameTime = timeStamp; // remember the time of the rendered frame
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    var secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    var elapsedSeconds = (timeStamp - start) / 1000;
    oldTimeStamp = timeStamp;
  
    var fps = Math.round(10 / secondsPassed) / 10;

    draw(timeStamp);
  
    if (elapsedSeconds > 5) {
      return;
    } else {
      window.requestAnimationFrame(loop);
    }
  }
  
function draw(timestamp) {
  const radius = 1500;
  const startangle = theta - 1 / 16 * Math.PI;
  const endangle = theta + 1 / 16 * Math.PI;
  ctx.fillStyle = 'rgba(248,206,105,0.7)';  
  ctx.beginPath();//ADD THIS LINE!<<<<<<<<<<<<<
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, startangle, endangle);
  ctx.lineTo(x, y);
  ctx.fill(); // or context.fill()
  ctx.beginPath();//ADD THIS 
  ctx.fillStyle = '#d45d54';//#DC143C
  ctx.strokeStyle="#black";
  ctx.lineWidth="10";
  ctx.arc(x, y, 7, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fill(); // or context.fill()*/
}
  
ros.on('error', function (error) {
    console.log(error);
});

ros.on('connection', function () {
    console.log('Connection made!');
});

ros.on('close', function () {
  console.log('Connection closed.');
});

ros.connect('ws://localhost:9090');

var listener = new ROSLIB.Topic({
  ros: ros,
  name: '/listener',
  messageType: 'std_msgs/String'
});

function shareKakaotalk(sig_name)
{
  Kakao.API.request({
    url: '/v2/api/talk/memo/default/send',
    data: {
      template_object: {
        object_type: 'text',
          text: sig_name+"가 발생한 것 같아요!",
          link: {
            web_url: 'http://192.168.0.193',
            mobile_web_url: 'http://192.168.0.193',
          },
        button_title : "BADA에서 확인하기"
      },
    },
          success: function(response) {
            console.log(response);
          },
          fail: function(error) {
            console.log(error);
          },
  });
}
/*


var audio_topic = new ROSLIB.Topic({
    ros: ros,
    name:'/audio',
    // name: '/bada_audio/audio',
    messageType: 'std_msgs/String'
});

audio_topic.subscribe(function (m){

    str = m.data;

    for (var i = 0; i < 100; i++) str = str.replace("\"", "");
    str = str.substring(1);
    str = str.substring(1);
    str = str.slice(0, -1);
    str = str.slice(0, -1);
    for (var i = 0; i < 100; i++) str = str.replace(",", "");
    for (var i = 0; i < 100; i++) str = str.replace("[", "");
	str=str.split("]");

    document.getElementById("first_topic").innerHTML = str[0];
    document.getElementById("second_topic").innerHTML = str[1];
    document.getElementById("third_topic").innerHTML = str[2];
    document.getElementById("fourth_topic").innerHTML = str[3];
    document.getElementById("fifth_topic").innerHTML = str[4];
    document.getElementById("sixth_topic").innerHTML = str[5];
    document.getElementById("seventh_topic").innerHTML = str[6];
    document.getElementById("eighth_topic").innerHTML = str[7];
    document.getElementById("ninth_topic").innerHTML = str[8];
    document.getElementById("tenth_topic").innerHTML = str[9];
});

var audio_topic = new ROSLIB.Topic({
  ros: ros,
  name: '/audio',
  messageType: 'std_msgs/String'
});

audio_topic.subscribe(function (m) {
  str = m.data;
  console.log(str);
  str = str.replace("\"", "").replace("\"", "");
  for(var i=0;i<100;i++) str = str.replace("\"","");
  str = str.substring(1);
  str = str.substring(1);
  str = str.slice(0,-1);
  str = str.slice(0,-1);
  //JSON.parse doesn't work. Failed to fix the syntax error.
  str = str.replace("[","");
  str = str.replace("]","");
  str = str.replace("[","");
  str = str.replace("]","");
  str = str.replace("[","");
  str = str.replace("]","");
  str = str.substring(0,str.indexOf("["));
  str = str.slice(0,-1);
  str = str.slice(0,-1);
  str = str.split(",");
  //console.log(str);

  document.getElementById("first_topic_name").innerHTML = str;
  document.getElementById("first_topic_proba").innerHTML=str[1];
  document.getElementById("second_topic_name").innerHTML=str[2];
  document.getElementById("second_topic_proba").innerHTML=str[3];
  document.getElementById("third_topic_name").innerHTML=str[4];
  document.getElementById("third_topic_proba").innerHTML=str[5];
  
});
*/