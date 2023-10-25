
const stream_type = document.getElementById("stream_type"); // select
const stream_title = document.getElementById("stream_title"); // input
const stream_url = document.getElementById("stream_url"); // input url
const stream_stub = document.getElementById("stream_stub"); // input azuracast
const stream_server = document.getElementById("stream_server"); // input azuracast
const stream_tune = document.getElementById("stream_tune"); // button
const stream_add = document.getElementById("stream_add"); // button

const tunerlist = document.getElementById("tunerlist"); // presets

const querystring = window.location.search;
const urlParams = new URLSearchParams(querystring);
let stream_type_param = urlParams.get('type');
let server_url = urlParams.get('server');
let server_stub = urlParams.get('stub');
let stream_url_param = urlParams.get('url');
let stream_title_param = urlParams.get('title');

const player = document.getElementById("player"); // audio
const stream = document.getElementById("stream"); // source

//Controls
const play_pause = document.getElementById("play-pause"); // button
const toggle_mute = document.getElementById("toggle-mute"); // button
const volume = document.getElementById("volume"); // input
const precise_volume = document.getElementById("precise-volume"); // input

const now_playing = document.getElementById("now-playing"); // div
const now_title = document.getElementById("now-title"); // span
const now_artist = document.getElementById("now-artist"); // span
const now_art = document.getElementById("now-art"); // img
const now_elapsed = document.getElementById("now-elapsed"); // span
const now_duration = document.getElementById("now-duration"); // span
const now_progress = document.getElementById("now-progress"); // progress

const playing_next = document.getElementById("playing-next"); // div
const next_title = document.getElementById("next-title"); // span
const next_artist = document.getElementById("next-artist"); // span
const next_art = document.getElementById("next-art"); // img
const next_until = document.getElementById("next-until"); // span

const station_name = document.getElementById("station-name");
const station_info = document.getElementById("station-info");

const requests = document.getElementById("requests");
let requests_list = document.getElementById("requests-list");
const request_error = document.getElementById("request-error");

const sources = document.getElementById("sources");

const history = document.getElementById("history");
const history_wrapper = document.getElementById("history-wrapper");

play_pause.addEventListener("click", function() {
    if (player.paused) {
        player.load();
        player.play();
        this.children[0].classList.remove("fa-play");
        this.children[0].classList.add("fa-pause");

        // update aria labels
        this.setAttribute("aria-label", "Pause");
        this.setAttribute("title", "Pause");
    } else {
        player.pause();
        this.children[0].classList.remove("fa-pause");
        this.children[0].classList.add("fa-play");
        this.setAttribute("aria-label", "Play");
        this.setAttribute("title", "Play");
    }
});


const updateMuteButtonIcon = _ => {
    if (player.muted) {
        toggle_mute.children[0].classList = "fa-fw fa-solid fa-volume-mute";
        toggle_mute.classList = "muted";
        return;
    }
    
    // if volume is 0, "fa-volume-off"
    else if (player.volume >= 0 && player.volume < 0.15) {
        toggle_mute.children[0].classList = "fa-fw fa-solid fa-volume-off";
        
    }
    
    // if volume is => 0 and < 0.5, "fa-volume-down"
    else if (player.volume >= 0.15 && player.volume < 0.5) {
        toggle_mute.children[0].classList = "fa-fw fa-solid fa-volume-down";
    }

    // if volume is => 0.5, "fa-volume-up"
    else {
        toggle_mute.children[0].classList = "fa-fw fa-solid fa-volume-up";
    }
    toggle_mute.classList = "";
}

toggle_mute.addEventListener("click", function() {
    if (player.muted) {
        player.muted = false;
        this.setAttribute("aria-label", "Mute");
        this.setAttribute("title", "Mute");
    } else {
        player.muted = true;
        this.setAttribute("aria-label", "Unmute");
        this.setAttribute("title", "Unmute");
    }

    updateMuteButtonIcon();

    // save "muted" to localstorage
    localStorage.setItem("muted", player.muted);
});

if (localStorage.getItem("muted") == "true") toggle_mute.click();

function setVolume (new_volume=50) {
    console.log(new_volume)
    player.volume = new_volume / 100;
    precise_volume.value = new_volume;
    volume.value = new_volume / 100;
    updateMuteButtonIcon();

    localStorage.setItem("volume", new_volume);
}

volume.addEventListener("input", function() {
    player.volume = this.value;
    precise_volume.value = this.value * 100;

    updateMuteButtonIcon();

    localStorage.setItem("volume", this.value * 100);
});

precise_volume.addEventListener("input", _=>{
    setVolume(this.value);
});

setVolume(parseInt(localStorage.getItem("volume")));

let presetList = [];
if (localStorage.getItem("presetList")) presetList = JSON.parse(localStorage.getItem("presetList"));

stream_type.addEventListener("change", function() {
    if (stream_type.value == "url") {
        stream_url.disabled = false;

        stream_stub.disabled = true;
        stream_server.disabled = true;
        
    } else if (stream_type.value == "azuracast") {
        stream_stub.disabled = false;
        stream_server.disabled = false;

        stream_url.disabled = true;
    }
});

if (stream_type_param) {
    stream_type.value = stream_type_param;
    stream_type.dispatchEvent(new Event('change'));
}
if (server_url) stream_server.value = server_url;
if (server_stub) stream_stub.value = server_stub;
if (stream_url_param) stream_url.value = stream_url_param;
if (stream_title_param) stream_title.value = stream_title_param;

const updateTunerList = () => {
    tunerlist.innerHTML = "";

    presetList.forEach((stream, index) => {
        let chip = document.createElement("div");
        chip.classList.add("chip");
        chip.classList.add("preset");
        
        chip.innerHTML = `
        <div class="info">
            <span class="title">${stream.title}</span>
            <div class="buttons">
                <button onclick='tuneRadio("${stream.type}", "${stream.url}", "${stream.server}", "${stream.stub}");' class="tune"><i class="fa-fw fa-solid fa-radio"></i> Tune</button>
                <button onclick="removeStation(${index})" title="remove" class="remove"><i class="fa-fw fa-solid fa-trash"></i></button>
            </div>
        </div>`


        tunerlist.appendChild(chip);
    }
    );
}

let statsListener = null;
try {
    statsListener = new IcecastMetadataStats(
        stream_url_param,
        8000,
        function (metadata) {
            now_title.innerText = metadata.StreamTitle;
            now_artist.innerText = metadata.StreamUrl;
            now_art.src = metadata.StreamUrl;
        },
        function (error) {
            console.log(error);
        }
    )
} catch (error) {
    console.log(error);
}

const formatTime = (time) => {

    let minutes = Math.floor(time / 60);
    let seconds = Math.floor(time % 60);

    if (seconds < 10) seconds = "0" + seconds;

    return minutes + ":" + seconds;

}

const relativeTime = new Intl.RelativeTimeFormat('en');

const updateMetadataApi = (title, artist, album, art, elapsed=null, duration=null) => {
    // Uses the Media Session API to update the metadata
    navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: album,
        artwork: [
            { src: art, type: 'image/jpeg' },
        ]
    });

    // When played, make sure to force load the audio
    navigator.mediaSession.setActionHandler('play', function () {
        player.load();
        player.play();
    }
    );

    if (elapsed && duration) {
        navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: elapsed
        });
    }

    // update title
    document.title = title + " by " + artist + ` [${station_name.innerText}]` + " ~ radio player";
}

const updateNowPlayingIcecast = _ => {
    statsListener = new IcecastMetadataStats(
        stream_url_param,
        {
            sources: ["icy"],
            onStats: function (metadata) {
                now_title.innerText = metadata.icy.StreamTitle;
                now_artist.innerText = "";

                updateMetadataApi(metadata.icy.StreamTitle, station_name.innerText, "", "/assets/icon-300.png");
            }
        }
    )
    statsListener.start();
}

const updateHistoryListAzuracast = async (data) => {
    // np request has already been made
    let historyList = data.song_history;

    history.innerHTML = "";



    historyList.forEach(song => {
        let finishTime = (song.played_at + song.duration) * 1000;
        let now = new Date();
        let timeSinceThen = (now - finishTime) / 1000 / 60; //minutes

        let chip = document.createElement("div");
        chip.classList = "chip song no-background compact";
        chip.innerHTML = `
        <img src="${song.song.art}" class="art" />
        <div class="info">
            <span class="title">${song.song.title}</span>
            <span class="moreinfo><span class="artist">${song.song.artist}</span><span class="subtitle">${relativeTime.format(Math.floor(-timeSinceThen), "minute")}</span></span>
        </div>`
        
        history.appendChild(chip);
    });
}


const updateNowPlaying = async _ => {
    if (statsListener) statsListener.stop();

    if (stream_type_param == "url") {
        now_playing.getElementsByClassName("progress")[0].classList.add("hidden");
        playing_next.classList.add("hidden");
        history_wrapper.classList.add("hidden");
        updateNowPlayingIcecast();
    } else if (stream_type_param == "azuracast") {
        // select the div with the "progress" class in the now-playing div
        now_playing.getElementsByClassName("progress")[0].classList.remove("hidden");
        playing_next.classList.remove("hidden");
        history_wrapper.classList.remove("hidden");

        let npUrl = server_url + "/api/nowplaying/" + server_stub;
        let npRequest = await fetch(npUrl);
        let np = await npRequest.json();

        updateHistoryListAzuracast(np);

        now_title.innerText = np.now_playing.song.title;
        now_artist.innerText = np.now_playing.song.artist;
        now_art.src = np.now_playing.song.art;

        let elapsed = np.now_playing.elapsed;
        let duration = np.now_playing.duration;

        now_elapsed.innerText = formatTime(elapsed);
        now_duration.innerText = formatTime(duration);

        now_progress.value = elapsed;
        now_progress.max = duration;

        next_title.innerText = np.playing_next.song.title;
        next_artist.innerText = np.playing_next.song.artist;
        next_art.src = np.playing_next.song.art;

        let until = Math.floor(((Date.now() / 1000) - (np.playing_next.played_at)) / 60);
        next_until.innerText = relativeTime.format(-until, 'minutes');

        updateMetadataApi(np.now_playing.song.title, np.now_playing.song.artist, station_name.innerText, np.now_playing.song.art, elapsed, duration);
    }
}

let updater = setInterval(updateNowPlaying, 2500);

async function searchRequests (query="") {
    let please = await updateRequestList();
    if (!query) return;
    let newlist = document.createElement("div");
    newlist.id = "requests-list"
    requests_list.childNodes.forEach(song => {
        console.log(song.dataset.sortName.toLowerCase() + " vs. " + query.toLowerCase());
        if (song.dataset.sortName.toLowerCase().includes(query.toLowerCase())) {
            newlist.appendChild(song);
        }
    });

    if (newlist.childElementCount = 0) {
        request_error = `No results found for ${query}`;
    }

    requests_list.replaceWith(newlist);
    requests_list = newlist;
}

const requestSong = async (request_id) => {
    request_error.classList.add("hidden");
    let requestUrl = server_url + "/api/station/" + server_stub + "/request/" + request_id;

    let requestRequest = await fetch(requestUrl);
    let requestData = await requestRequest.json();

    if (requestRequest.status != 200) {
        request_error.classList.remove("hidden");
        request_error.innerText = requestData.formatted_message;
        return;
    }

    updateRequestList();
}

const tuneAudioStream = async (url) => {
    // ensures a non-cached stream
    stream.src = url + "?nocache=" + Math.random();
    player.load();
    player.play();
}

const updateRequestList = async _ => {
    // updates the list of requestable songs from Azuracast.
    let requestUrl = server_url + "/api/station/" + server_stub + "/requests";

    let requestRequest = await fetch(requestUrl);
    let requestData = await requestRequest.json();
    if (requestRequest.status != 200) {
        requests.classList.add("hidden");
        request_error.classList.remove("hidden");
        requests_error.innerHTML = `<div class="chip">${requestData.formatted_message}</div>`;
        return;
    }
    request_error.classList.add("hidden");
    requests.classList.remove("hidden");

    requests_list.innerHTML = "";
    requestData.forEach(request => {
        let chip = document.createElement("div");
        chip.classList = "chip song request compact";
        chip.dataset.sortName = request.song.text;
        chip.innerHTML = `
        <img src="${request.song.art}" class="art" />
        <div class="info">
            <span class="title">${request.song.title}</span>
            <span class="artist subtitle">${request.song.artist}</span>
            <div class="buttons">
                <button onclick='requestSong("${request.request_id}")' class="request"><i class="fa-fw fa-solid fa-music"></i> Request</button>
            </div>
        </div>`
        requests_list.appendChild(chip);
    });

}

const tuneRadioAzuracast = async (server, stub) => {
    let infoUrl = server + "/api/station/" + stub;

    let infoRequest = await fetch(infoUrl);
    let info = await infoRequest.json();

    // update metadata
    stream_title_param = info.name;
    station_name.innerText = info.name;
    station_info.innerText = info.description;

    stream.src = info.listen_url + "?nocache=" + Math.random();

    // get sources
    sources.innerHTML = "";
    info.mounts.forEach(mount => {
        let source = document.createElement("button");
        source.innerText = mount.name;
        source.classList.add("source");
        if (mount.is_default) source.classList.add("active");

        source.addEventListener("click", _ => {
            tuneAudioStream(mount.url);

            // change classnames
            let currentDefault = document.querySelector(".source.active");
            currentDefault.classList.remove("active");
            source.classList.add("active");
        });

        sources.appendChild(source);
    });

    
    player.load();
    player.play();
    updateRequestList();
}

const getIcecastStationMetadata = async (url, displayName="") => {
    sources.innerHTML = "";

    // remove the last part of the url
    let urlParts = url.split("/");
    urlParts.pop();
    let baseUrl = urlParts.join("/");
    let infoUrl = baseUrl + "/status-json.xsl";

    let infoRequest = await fetch(infoUrl);
    let info = await infoRequest.json();

    /* if there were any issues, return null */
    if (!info.icestats.source) return;

    let source = info.icestats.source;
    /* Source is either an object or an array of objects */
    if (Array.isArray(source)) source = source[0];
    if (source.station_name) station_name.innerText = source.server_name;
    else station_name.innerText = displayName;
    station_info.innerText = source.server_description;
    now_title.innerText = source.title;
    now_artist.innerText = source.server_name;

    // if there's more than one source show them in the sources list
    if (info.icestats.source.length > 1) {
        info.icestats.source.forEach(source => {
            let sourceButton = document.createElement("button");
            if (source.server_name) sourceButton.innerText = source.server_name;
            else sourceButton.innerText = source.mount;
            sourceButton.classList.add("source");
            if (source.server_name == stream_url_param) sourceButton.classList.add("active");

            sourceButton.addEventListener("click", _ => {
                stream.src = url.split("/").slice(0, -1).join("/") + source.mount + "?nocache=" + Math.random();;
                player.load();
                player.play();

                // change classnames
                try {let currentDefault = document.querySelector(".source.active");
                currentDefault.classList.remove("active");
                sourceButton.classList.add("active");
            } catch (error) {
                sourceButton.classList.add("active");
            }
            });

            sources.appendChild(sourceButton);
        });
    }
}

const tuneRadio = (type, url, server, stub) => {
    updater = clearInterval(updater);
    console.log("Tuning to " + type + " " + url + " " + server + " " + stub);

    if (!server.startsWith("http") && server) server = "https://" + server;
    server_url = server;
    stream_server.value = server;
    server_stub = stub;
    stream_stub.value = stub;
    stream_type_param = type;
    stream_type.value = type;
    stream_url_param = url;
    stream_url.value = url;
    stream_title_param = "";
    stream_title.value = "";

    now_art.src = "/assets/icon-300.png";

    if (type == "url") {
        stream.src = url + "?nocache=" + Math.random();
        stream_title_param = stream_title.value;
        station_name.innerText = stream_title.value;
        station_info.innerText = "";
        getIcecastStationMetadata(url, stream_title.value);
        player.load();
        player.play();
    } else if (type == "azuracast") {
        tuneRadioAzuracast(server, stub);
    }


    updateNowPlaying();
    updater = setInterval(updateNowPlaying, 5000);
}

const getValuesAndTune = _ => {
    let type = stream_type.value;
    let url = stream_url.value;
    let server = stream_server.value;
    let stub = stream_stub.value;

    tuneRadio(type, url, server, stub);
}

stream_add.addEventListener("click", function() {
    let stream = {};
    stream.type = stream_type.value;
    stream.title = stream_title.value;
    stream.url = stream_url.value;
    stream.stub = stream_stub.value;
    stream.server = stream_server.value;

    presetList.push(stream);
    localStorage.setItem("presetList", JSON.stringify(presetList));
    updateTunerList();
});

stream_tune.addEventListener("click", _ => {
    tuneRadio(stream_type.value, stream_url.value, stream_server.value, stream_stub.value)
})

const removeStation = (index) => {
    presetList.splice(index, 1);
    localStorage.setItem("presetList", JSON.stringify(presetList));

    updateTunerList();
}

player.addEventListener("play", function() {
    play_pause.children[0].classList.remove("fa-play");
    play_pause.children[0].classList.add("fa-pause");

    // update aria labels
    play_pause.setAttribute("aria-label", "Pause");
    play_pause.setAttribute("title", "Pause");
});

player.addEventListener("pause", function() {
    play_pause.children[0].classList.remove("fa-pause");
    play_pause.children[0].classList.add("fa-play");
    play_pause.setAttribute("aria-label", "Play");
    play_pause.setAttribute("title", "Play");
});

const unformatTime = (time) => {
    let parts = time.split(":");
    let minutes = parseInt(parts[0]);
    let seconds = parseInt(parts[1]);

    return minutes * 60 + seconds;
}

const incrementTime = _ => {
    let elapsed = now_progress.value;
    elapsed++;
    now_progress.value = elapsed;
    now_elapsed.innerText = formatTime(elapsed);
}



updateTunerList();
setInterval(incrementTime, 1000);

