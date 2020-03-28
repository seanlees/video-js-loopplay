if (typeof jQuery === 'undefined') {
    throw new Error('xl-video\'s JavaScript requires jQuery')
}
if (typeof videojs === 'undefined') {
    throw new Error('xl-video\'s JavaScript requires videojs')
}

function xl_hlsvideo(options) {
    this.size = 4;
    this.players = {};  //所有的视频播放器
    this.playerQueue = [];
    this.timeTimer = null;
    this.loopTimer = null;
    this.__countDownLoopTime = 0
    this.options = {
        size: 4,
        element: "videoList",
        loop: {
            autoStart: false,
            interval: 10 //秒
        }
    };
    this.options = $.extend(this.options, options);
    this.element = document.getElementById(options.element);
}

xl_hlsvideo.prototype.create = function (data, options) {
    var id = data.uid;
    var playerId = 'player' + data.uid;
    var newVideo = document.createElement("div");//创建一个标签
    newVideo.id = 'videoContainer-' + playerId;
    newVideo.classList.add("videoContainer");
    newVideo.style.display = "none";
    newVideo.innerHTML = '<video id=' + playerId + ' style="object-fit:fill;" class="video-js vjs-default-skin vjs-16-9"' +
        '  controls preload="none"></video><!--<label style="background-color:#fff;height:8%;">' + data.name + '</label>-->';
    this.element.appendChild(newVideo);//把创建的节点newVideo添加到父节点中；

    var player = videojs(playerId, $.extend({
        muted: true,        //是否静音
        controls: false,    // 是否显示控制条
        autoplay: false,
        loop: false,
        sources: [{
            src: data.priviewUrl || "http://www.baidu.com",
            type: 'application/x-mpegURL'
        }]
    }, options || {}));
    player._id = id;
    player._parentDivId = newVideo.id;
    player._show = false;
    this.players[id] = player;
    this.push(id);
    //自动开始轮播
    if (this.options.loop.autoStart && !this._loopStarted) {
        this.loopStart();
    }
};

//播放队列的入栈
xl_hlsvideo.prototype.push = function (id) {
    var player = this.players[id];
    if (player) {
        var node = document.getElementById(player._parentDivId);

        //获取当前显示得个数
        var currentShowSize = 0;
        for (var key in this.players) {
            if (this.players[key]._show) {
                currentShowSize++;
            }
        }
        if (currentShowSize < this.size) {
            node.style.display = "block";
            player._show = true;
            player.play();
        } else {
            node.style.display = "none";
            player._show = false;
            player.pause();
        }
        player._delete = false;
        this.playerQueue.push(player);
    }
};

//播放队列的出栈
xl_hlsvideo.prototype.pop = function (id) {
    var player = this.players[id];
    if (player) {
        var index = this.playerQueue.indexOf(player);       //显示队列中移除
        if (index > -1) {
            this.playerQueue.splice(index, 1);
        }
        //进行隐藏
        var node = document.getElementById(player._parentDivId);
        node.style.display = "none";
        player._show = false;
        player._delete = true;
        this.players[id] = player;
        player.pause();
    }
    //判断状态是否是播放、如果是播放状态，隐藏一个显示另外一个
    for (var i = 0; i < this.playerQueue.length; i++) {
        var p = this.playerQueue[i];
        if (!p._show) {
            var node = document.getElementById(p._parentDivId);
            node.style.display = "block";
            p._show = true;
            p.play();
            break;
        }
    }
};

//队列中播放器的轮播，一次换掉size个
xl_hlsvideo.prototype.pipline = function () {
    //隐藏已轮播的视频
    for (var key in this.players) {
        var player = this.players[key];
        if (player._show) {
            var node = document.getElementById(player._parentDivId);
            node.style.display = "none";
            player._show = false;
            player.pause();

            var index = this.playerQueue.indexOf(player);       //显示队列中移除
            if (index > -1) {
                this.playerQueue.splice(index, 1);
            }
        }
    }

    var piplineSize = this.size;
    //判断队列大小，取小值
    if (this.playerQueue.length < this.size) {
        piplineSize = this.playerQueue.length;
    }
    //显示已轮播的视频
    for (var i = 0; i < piplineSize; i++) {
        var player = this.playerQueue.shift();
        var node = document.getElementById(player._parentDivId);
        node.style.display = "block";
        player._show = true;
        player.play();
    }

    //队列不够一页，把所有设备从头添加进去, 方便下次用
    if (this.playerQueue.length < this.size) {
        for (var key in this.players) {
            var p = this.players[key];
            console.log("player: " + key + ",show status:" + p._show);
            if (!p._show && !p._delete) {
                this.playerQueue.push(p);
            }
        }
    }
};

xl_hlsvideo.prototype._play = function () {
    if (this.players.length <= 4) {
        this.loopStop();
        var stopMsg = "<font color='yellow'>视频不多于4个不进行轮询播放</font>";
        this.showLoopMsg(stopMsg);
        return;
    } else {
        this.showLoopMsg();
        if (this.__countDownLoopTime != this.options.loop.interval) {    //没有倒计时到0 ，不进行轮播
            return;
        }
    }

    console.log("__countDownLoopTime:" + this.__countDownLoopTime);


    this.pipline();
};

xl_hlsvideo.prototype.loopStart = function (time) {
    if (this._loopStarted) {
        this.loopStop();
    }

    if (time && time > 1) {
        this.options.loop.interval = time;
    }
    //视频轮播
    //this.loopTimer = setInterval(this._play.bind(this), this.options.loop.interval * 60 * 1000);
    this.__countDownLoopTime = parseInt(this.options.loop.interval);
    this.timeTimer = setInterval(this._play.bind(this), 1000);
    this._loopStarted = true;
};

xl_hlsvideo.prototype.loopStop = function () {
    clearInterval(this.timeTimer);
    clearInterval(this.loopTimer);
    this._loopStarted = false;
};

xl_hlsvideo.prototype.showLoopMsg = function (msg) {
    if (msg) {
        document.getElementById("timer").innerHTML = msg;
        return;
    }
    if (this.__countDownLoopTime > 0) {
        --this.__countDownLoopTime;
    } else {
        this.__countDownLoopTime = parseInt(this.options.loop.interval);
    }
    minutes = Math.floor(this.__countDownLoopTime / 60);
    seconds = Math.floor(this.__countDownLoopTime % 60);
    msg = "距离轮播还有<font color=red>" + minutes + "</font>分<font color=red>" + seconds + "</font>秒";
    document.getElementById("timer").innerHTML = msg;
}