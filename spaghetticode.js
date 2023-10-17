const playPause = document.getElementById("play-pause");
const audio = document.getElementById("audio");
const audioSource = audio.children[0];

const now_title = document.getElementById("now_title");
const now_artist = document.getElementById("now_artist");
const now_art = document.getElementById("now_art");
const now_elapsed = document.getElementById("now_elapsed");
const now_duration = document.getElementById("now_duration");
const now_progress = document.getElementById("now_progress_bar"); // progress bar

const next_title = document.getElementById("next_title");
const next_artist = document.getElementById("next_artist");
const next_art = document.getElementById("next_art");
const next_until = document.getElementById("next_until");

const bitrate_decider = document.getElementById("bitrate");

const volume = document.getElementById("volume");
const volume_label = document.getElementById("volume_manual");

const radio_title = document.getElementById("title");
const radio_description = document.getElementById("description");

const lyrics = document.getElementById("lyrics");

const requests = document.getElementById("requests");

const main = document.getElementsByTagName("main")[0];

const change_view_button = document.getElementById("change_view_button");


// get query params
const urlParams = new URLSearchParams(window.location.search);
let slug;
let serverUrl;
urlParams.get('slug') ? slug = urlParams.get('slug') : slug = "nya_nya_radio";
urlParams.get('url')  ? serverUrl = urlParams.get('url') : serverUrl = "https://radio.nya.tf";

 // set the requests iframe
requests.src = `${serverUrl}/public/${slug}/embed-requests?theme=dark`;


let hash = window.location.hash;
if (hash == "#lyrics") {
    document.body.classList.add("lyrics");
    // remove the History section
    document.getElementById("history").remove();
    document.getElementById("nowplaying").classList.add("compact");
}

change_view_button.addEventListener("click", _ => {
    if (window.location.hash == "#lyrics") {
        window.location.hash = "";
        change_view_button.innerHTML = "<span class=\"icon fa-solid fa-arrow-right fa-fw\"></span>Open lyrics view";
    } else {
        window.location.hash = "lyrics";
        change_view_button.innerHTML = "<span class=\"icon fa-solid fa-arrow-left fa-fw\"></span>Close lyrics view";
    }
});

// check if the hash changes
window.addEventListener("hashchange", _ => {
    hash = window.location.hash;
    if (window.location.hash == "#lyrics") {
        document.body.classList.add("lyrics");
        // remove the History section
        document.getElementById("history").remove();
        document.getElementById("nowplaying").classList.add("compact");
    } else {
        document.body.classList.remove("lyrics");
        // add the History section
        let main = document.getElementsByTagName("main")[0];
        let history = document.createElement("div");
        history.id = "history";
        main.appendChild(history);
    }
});

const updatePlayerData = async _ => {
    let radio_data = await fetch(serverUrl + "/api/station/" + slug);

    let data = await radio_data.json();

    if (slug != "byemc_pirate_radio") {
        radio_title.innerText = data.name;
    }
    radio_description.innerText = data.description;

    switchStream(data.listen_url, true)

    const mounts = data.mounts; // list of mount points.
    bitrate_decider.innerHTML = ""; // clear the bitrate decider
    // for each mount point, create a button
    mounts.forEach(mount => {
        const button = document.createElement("button");
        button.innerText = mount.name;
        let mount_name_slug = mount.name.toLowerCase().replace(" ", "_");
        button.id = mount_name_slug;
        if (mount.is_default) button.classList = "active";
        button.addEventListener("click", _ => {
            bitrate_decider.childNodes.forEach(button => {
                button.classList = "";
            });
            button.classList = "active";
            switchStream(mount.url);
        });
        bitrate_decider.appendChild(button);
    }) 
}

updatePlayerData();

const setStation = (Sserver, Sslug) => {
    // set the slug
    slug = Sslug;
    // set the server
    serverUrl = Sserver;
    // update the player data
    updatePlayerData();
    // update the metadata
    updateMetadata();

    audio.load();
    audio.play();
}

const setVolume = volume => {
    audio.volume = volume / 100;
    volume_label.value = volume;
    document.getElementById("volume").value = volume;
    // save the volume to localstorage
    localStorage.setItem("volume", volume);
}

volume.addEventListener("input", _=>{setVolume(volume.value)});
volume_label.addEventListener("input", _=>{setVolume(volume_label.value)});

const reportMediaToBrowser = (title, artist, album, art, duration=Infinity, position=0) => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: artist,
            album: album,
            artwork: [
                { src: art, type: 'image/jpeg' },
            ]
        });

        navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: position,
        })

        // if using media controls to play the stream, force the audio to load
        navigator.mediaSession.setActionHandler('play', _ => {
            audio.load();
            audio.play();
        });
    }
}

const formatTime = time => {
    // time in seconds. return an internationalized string
    return new Intl.DateTimeFormat('ie', { minute: 'numeric', second: 'numeric' }).format(new Date(time * 1000));
}

const updateMetadata = async _ => {
    let data = await fetch(serverUrl + "/api/nowplaying/" + slug);
    data = await data.json();


    const now_playing = data.now_playing
    now_title.innerText = now_playing.song.title;
    now_artist.innerText = now_playing.song.artist;
    if (now_playing.is_request) {
        now_artist.innerText += " (requested)";
    }
    now_art.src = now_playing.song.art;

    
    const playing_next = data.playing_next;
    next_title.innerText = playing_next.song.title;
    next_artist.innerText = playing_next.song.artist;
    if (playing_next.is_request) {
        next_artist.innerText += " (requested)";
    }
    next_art.src = playing_next.song.art;
    const relativeUntil = new Intl.RelativeTimeFormat('ie', { style: 'long', numeric: 'auto' });
    const until = Math.floor(((Date.now() / 1000) - (playing_next.played_at)) / 60);
    next_until.innerText = relativeUntil.format(-until, 'minute');

    now_elapsed.innerText = new Intl.DateTimeFormat('ie', { minute: 'numeric', second: 'numeric' }).format(new Date(now_playing.elapsed * 1000));
    now_duration.innerText = new Intl.DateTimeFormat('ie', { minute: 'numeric', second: 'numeric' }).format(new Date(now_playing.duration * 1000));
    now_progress.max = now_playing.duration;
    now_progress.value = now_playing.elapsed;

    if (hash == "#lyrics") {
        // if there is more than 30 seconds left, add the hiddent class to the next song
        let timeLeft = now_playing.duration - now_playing.elapsed;
        next_until.innerText = relativeUntil.format(timeLeft, 'second');
        if (timeLeft > 30) {
            document.getElementsByClassName("playingnext")[0].classList.add("hidden");
            // if it doesnt already have "actuallyhidden", add it after .5 seconds
            if (!document.getElementsByClassName("playingnext")[0].classList.contains("actuallyhidden")) {
                setTimeout(_ => {
                    document.getElementsByClassName("playingnext")[0].classList.add("actuallyhidden");
                }, 500);
            }
        } else {
            document.getElementsByClassName("playingnext")[0].classList.remove("actuallyhidden");
            document.getElementsByClassName("playingnext")[0].classList.remove("hidden");
        }
    }

    if (now_playing.song.lyrics) lyrics.innerText = now_playing.song.lyrics;
    else lyrics.innerText = "No lyrics available.";
    
    reportMediaToBrowser(now_playing.song.title, now_playing.song.artist, "ByeMC Pirate Radio", now_playing.song.art, now_playing.duration, now_playing.elapsed);


    let history = data.song_history;
    history = history.slice(0, 5);
    const historyList = document.getElementById("history");
    historyList.innerHTML = "<h2 style='margin: 0'>History</h2>";
    history.forEach(song => {
        const div = document.createElement("div");
        div.className = "history-item chip compact no-background";

        const img = document.createElement("img");
        img.className = "np-art";
        img.src = song.song.art;
        img.alt = "Album Art";
        div.appendChild(img);

        const divInfo = document.createElement("div");
        divInfo.className = "np-info";
        div.appendChild(divInfo);

        const spanTitle = document.createElement("span");
        spanTitle.innerText = song.song.title;
        divInfo.appendChild(spanTitle);

        const spanArtist = document.createElement("span");
        spanArtist.className = "subtitle";
        spanArtist.innerText = song.song.artist;
        if (song.is_request) {
            spanArtist.innerText += " (requested)";
        }
        divInfo.appendChild(spanArtist);

        spanArtist.appendChild(document.createTextNode(" • "));

        const divMoreData = document.createElement("div");
        divMoreData.className = "moredata";
        divInfo.appendChild(divMoreData);
        
        const spanPlayedAt = document.createElement("span");
        spanPlayedAt.className = "subtitle";

        // current time - played at
        const playedAt = Math.floor(((Date.now() / 1000) - (song.played_at + song.duration)) / 60);


        spanPlayedAt.innerText = "ended " + relativeUntil.format(-playedAt, 'minute');
        spanArtist.appendChild(spanPlayedAt);


        historyList.appendChild(div);
    });

}

const switchStream = (stream, noplay=false) => {
    audioSource.src = stream + "?nocache=" + Date.now();
    audio.load();
    if (!noplay) {
        audio.play();
        playPause.children[0].classList = "fa-solid fa-pause";
    }
}

const incrementProgress = _ => {
    // fake incrementation until the next request
    now_progress.value += 1;
    // also increment the time
    now_elapsed.innerText = new Intl.DateTimeFormat('ie', { minute: 'numeric', second: 'numeric' }).format(new Date(now_progress.value * 1000));

    if (hash == "#lyrics") {
        let lengthOfSong = now_progress.max;
        let currentTime = now_progress.value;
        let heightOfLyrics = lyrics.scrollHeight;
        let visibleHeightOfLyrics = lyrics.clientHeight;

        
        // if there is more than 30 seconds left, add the hiddent class to the next song
        let timeLeft = lengthOfSong - currentTime;
        next_until.innerText = new Intl.RelativeTimeFormat('ie', { style: 'long', numeric: 'auto' }).format(timeLeft, 'second');
        if (timeLeft > 30) {
            document.getElementsByClassName("playingnext")[0].classList.add("hidden");
            // if it doesnt already have "actuallyhidden", add it after .5 seconds
            if (!document.getElementsByClassName("playingnext")[0].classList.contains("actuallyhidden")) {
                setTimeout(_ => {
                    document.getElementsByClassName("playingnext")[0].classList.add("actuallyhidden");
                }, 500);
            }
        } else {
            document.getElementsByClassName("playingnext")[0].classList.remove("actuallyhidden");
            document.getElementsByClassName("playingnext")[0].classList.remove("hidden");
        }
        
        let bufferDelay = audio.buffered.end(0) - audio.buffered.start(0) - audio.currentTime; // delay in seconds
        if (currentTime < 30) currentTime = 0;

        let percentage = (currentTime) / (lengthOfSong);
        let pixels = (heightOfLyrics - (visibleHeightOfLyrics / 2)) * percentage;
        lyrics.scrollTop = pixels;

    }

}

const updateDebugInfo = _ => {
    // get the length of the buffer in seconds
    const bufferLength = audio.buffered.end(0) - audio.buffered.start(0);
    document.getElementById("buffer_length").innerText = "Buffer: " + bufferLength.toFixed(2) + "s";

    // get the current time in seconds
    const currentTime = audio.currentTime;
    document.getElementById("session_length").innerText = "Current Session: " + formatTime(currentTime);
}



// load the volume from localstorage
const volumeStorage = localStorage.getItem("volume");
if (volumeStorage) {
    setVolume(volumeStorage);
}

playPause.addEventListener("click", _ => {
    if (audio.paused) {
        audio.load();
        audio.play();
        playPause.children[0].classList = "fa-solid fa-pause";
    } else {
        audio.pause();
        playPause.children[0].classList = "fa-solid fa-play";
    }
});

audio.addEventListener("pause", _ => {
    playPause.children[0].classList = "fa-solid fa-play";
}
);

audio.addEventListener("play", _ => {
    playPause.children[0].classList = "fa-solid fa-pause";
}
);





updateMetadata();
let metadataInterval = setInterval(updateMetadata, 2000);
setInterval(incrementProgress, 1000);
setInterval(updateDebugInfo, 500);
setInterval(refreshStationTuner, 10000);
setTimeout(fullyUpdateStationList, 1000);