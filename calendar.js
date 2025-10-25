window.addEventListener("load", start);

// define global timestamps for first and last date of displayed calendar
var first;
var now = new Date();
var last;

// define global lat/lon of location being displayed (default to Lafayette, CO)

var gLatitude;
var gLongitude;


function start(mode = "search") {
  
  // add click behavior to next/prev buttons

  document.getElementById("prev").addEventListener("click", prev);
  document.getElementById("next").addEventListener("click", next);

  // clear out any currently displayed calendar
  document.getElementById("calendar").innerHTML = '';

  let params = null;
  if (mode == "current") {
    params = new URLSearchParams();
  }
  else if (mode == "favorite" || !document.location.search) {
    params = new URLSearchParams(localStorage.getItem('favorite'));
  }
  else {
    params = new URLSearchParams(document.location.search);
  }
  gLatitude = params.get("lat");
  gLongitude = params.get("lon");
  gName = params.get("name");
     
  // set angle adjustments if specified
    
  SunCalc.addTime(Number(params.get("sunriseAngle")), "sunrise", null);
  SunCalc.addTime(Number(params.get("sunsetAngle")), null, "sunset");

  // if bad (or no) params, use current location
  if (!gLatitude || !gLongitude || !gName) {
    
    // make sure browser supports geolocation
    if (!navigator.geolocation) {
      alert("This browser can not determine your current location.  Select a location by clicking the map icon first");
      return;
    }
    
    // get current location and call init
    document.getElementById("placeName").innerHTML = "Getting Current Location...";
    navigator.geolocation.getCurrentPosition(init);
  }
  else {  // ok to use current loc
    init({coords:{latitude: gLatitude, longitude: gLongitude}}, gName);
  }
}

// initialize once you have location info 
function init(position, placeName) {
  // update globals if necessary
  gLatitude = position.coords.latitude;  
  gLongitude = position.coords.longitude;
  
  
  // display place name (or default coordinates until reverse lookup completes)
  if (!placeName) {
    document.getElementById("placeName").innerHTML = `(${Math.round(position.coords.latitude*100)/100}, ${Math.round(position.coords.longitude*100)/100})`;
    setPlaceName(position);  // async
  }
  else {
    document.getElementById("placeName").innerHTML = placeName;
  }
  
  // get appropriate timezone for lat/lon
  let tz = tzlookup(gLatitude, gLongitude);
  if(!tz) tz = "America/Denver";

  gFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeStyle: "short",
  });

// establish "first" date as the first of the current month and make the table
  first = new Date();
  first.setDate(1);
  makeTable();
}

async function setPlaceName(pos) {  
  // attempt a reverse lookup of place name by lat/lon
  
  let url = `https://geocode.maps.co/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&api_key=6591c355a457b800916849qixd2539f`;

  await fetch(url)
    .then(response => response.json())
    .then((result) => {
      document.getElementById("placeName").innerHTML = `${result.address.town},${result.address.state},${result.address.country_code.toUpperCase()}`;
    })
}

function makeTable() {
  const msec = 1000 * 24 * 60 * 60; // msec in a day
  var stamp = new Date(first.getTime() - first.getDay() * msec); // back-up to Sunday
  last = new Date(first);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);

  const monthName = first.toLocaleString('en-us', {
    month: 'long'
  });

  document.getElementById("monthName").innerHTML = monthName + " " + first.getFullYear();

  document.getElementById("calendar").innerHTML = '';

  document.getElementById("calendar").appendChild(makeHeader());

  while (stamp.getTime() <= last.getTime()) {
    document.getElementById("calendar").appendChild(makeRow(stamp));
  }
}

function makeHeader() {
  let row = document.createElement("tr");
  row.appendChild(makeCell('th', 'Sun'));
  row.appendChild(makeCell('th', 'Mon'));
  row.appendChild(makeCell('th', 'Tue'));
  row.appendChild(makeCell('th', 'Wed'));
  row.appendChild(makeCell('th', 'Thu'));
  row.appendChild(makeCell('th', 'Fri'));
  row.appendChild(makeCell('th', 'Sat'));

  return row;
}

function makeRow(stamp) {
  let row = document.createElement("tr");

  for (i = 0; i < 7; i++) {
    const yesterday = new Date(stamp.valueOf() - 8.64e+7);
    const tomorrow = new Date(stamp.valueOf() + 8.64e+7);

    const curTimes = SunCalc.getTimes(stamp, gLatitude, gLongitude);
    curTimes.dayLength = ((curTimes.sunset - curTimes.sunrise) / (1000 * 60 * 60));
    const yesTimes = SunCalc.getTimes(yesterday, gLatitude, gLongitude);
    yesTimes.dayLength = ((yesTimes.sunset - yesTimes.sunrise) / (1000 * 60 * 60));
    const tomTimes = SunCalc.getTimes(tomorrow, gLatitude, gLongitude);
    tomTimes.dayLength = ((tomTimes.sunset - tomTimes.sunrise) / (1000 * 60 * 60));

    msg = "";
    td = makeCell('td');
    if (stamp.getTime() < first.getTime() || stamp.getTime() > last.getTime()) td.classList.add("offMonth");

    if (stamp.getYear() == now.getYear() && stamp.getMonth() == now.getMonth() && stamp.getDate() == now.getDate()) {
      td.classList.add("today");
    }

    let moonStyle = '';
    let phaseStyle = '';
    const curMoon = SunCalc.getMoonIllumination(stamp);
    const curMoonTimes = SunCalc.getMoonTimes(stamp, gLatitude, gLongitude);

    if (curMoon.phase <= 0.25) {
      moonStyle = `background: linear-gradient(90deg, black 50%, yellow 50%);`;
      const w = (0.25-curMoon.phase)*400;
      const l = curMoon.phase * 200;
      phaseStyle = `background-color: black; width: ${w}%; left: ${l}%`;
    }
    else if (curMoon.phase <= 0.5) {
      moonStyle = `background: linear-gradient(90deg, black 50%, yellow 50%);`;
      const w = (curMoon.phase - 0.25)*400;
      const l = (0.5 - curMoon.phase) * 200;
      phaseStyle = `background-color: yellow; width: ${w}%; left: ${l}%`;
    }
    else if (curMoon.phase <= 0.75) {
      moonStyle = `background: linear-gradient(90deg, yellow 50%, black 50%);`;
      const w = (0.75 - curMoon.phase)*400;
      const l = (curMoon.phase - 0.5) * 200;
      phaseStyle = `background-color: yellow; width: ${w}%; left: ${l}%`;
    }
    else {
      moonStyle = `background: linear-gradient(90deg, yellow 50%, black 50%);`;
      const w = (curMoon.phase - 0.75)*400;
      const l = (1.0 - curMoon.phase) * 200;
      phaseStyle = `background-color: black; width: ${w}%; left: ${l}%`;
    }
    const moonSet = curMoonTimes.set?`Moon set: ${gFormatter.format(curMoonTimes.set)}`:'Moon does not set';
    const moonRise = curMoonTimes.rise?`Moon rise: ${gFormatter.format(curMoonTimes.rise)}`:'Moon does not rise';
    const moonTitle = curMoonTimes.set && curMoonTimes.rise && curMoonTimes.set - curMoonTimes.rise < 0? `${moonSet}\n${moonRise}`:`${moonRise}\n${moonSet}`;
    
    
    td.innerHTML = `<div class="moonBG" title="${moonTitle}" onclick="alert(this.title)"><div class="moon" style="${moonStyle}"></div><div class="phase" style="${phaseStyle}"></div></div><div class="date">${stamp.getDate()}</div>`;
    
    if (curTimes.sunrise == "Invalid Date") {
      td.appendChild(makeCell('div', 'No Sunrise', 'sunrise'));
      td.appendChild(makeCell('div', 'No Sunset', 'sunset'));
    }
    else {
      sRise = makeCell('div', `${gFormatter.format(curTimes.sunrise)}`, 'sunrise');
      sSet = makeCell('div', `${gFormatter.format(curTimes.sunset)}`, 'sunset');
      dLen = makeCell('div', curTimes.dayLength.toFixed(2), 'dayLength');
      
      if (curTimes.sunrise.valueOf() <= yesTimes.sunrise.valueOf() + 8.64e+7 && curTimes.sunrise.valueOf() <= tomTimes.sunrise.valueOf() - 8.64e+7) {
        sRise.classList.add('earliest');
      }
      if (curTimes.sunrise.valueOf() >= yesTimes.sunrise.valueOf() + 8.64e+7 && curTimes.sunrise.valueOf() >= tomTimes.sunrise.valueOf() - 8.64e+7) {
        sRise.classList.add('latest');
      }
      if (curTimes.sunset.valueOf() <= yesTimes.sunset.valueOf() + 8.64e+7 && curTimes.sunset.valueOf() <= tomTimes.sunset.valueOf() - 8.64e+7) {
        sSet.classList.add('earliest');
      }
      if (curTimes.sunset.valueOf() >= yesTimes.sunset.valueOf() + 8.64e+7 && curTimes.sunset.valueOf() >= tomTimes.sunset.valueOf() - 8.64e+7) {
        sSet.classList.add('latest');
      }
      if (curTimes.dayLength > yesTimes.dayLength && curTimes.dayLength > tomTimes.dayLength) {
        dLen.classList.add("longest");
      }
      if (curTimes.dayLength < yesTimes.dayLength && curTimes.dayLength < tomTimes.dayLength) {
        dLen.classList.add("shortest");
      }
      
      td.appendChild(sRise);
      td.appendChild(sSet);
      td.appendChild(dLen);
    }
    row.appendChild(td);

    stamp.setDate(stamp.getDate() + 1); // mutates original stamp!
  }
  return row;
}

function makeCell(type, contents, className=null) {
  let e = document.createElement(type);
  let t = document.createTextNode(contents);
  e.appendChild(t);
  if (className) e.classList.add(className)
  return e;
}

function prev() {
  first.setMonth(first.getMonth() - 1);
  makeTable();
}

function next() {
  first.setMonth(first.getMonth() + 1);
  makeTable();
}

function formatTime(h, m) {
  h = (h - 1) % 12 + 1;
  m = m.toString().padStart(2, "0");
  return `${h}:${m}`;
}