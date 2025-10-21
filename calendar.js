window.addEventListener("load", start);

// establish "first" as the first of the current month:
var first = new Date();
first.setDate(1);
var now = new Date();

var last;
var gLatitude;
var gLongitude;

function start() {
  document.getElementById("prev").addEventListener("click", prev);
  document.getElementById("next").addEventListener("click", next);

  // see if location is provided in URL

  let params = new URLSearchParams(document.location.search);
  let paramLat = params.get("lat");
  let paramLon = params.get("lon");
  let paramName = params.get("name");
  let paramTZ = params.get("tz");
      
  SunCalc.addTime(Number(params.get("sunriseAngle")), "sunrise", null);
  SunCalc.addTime(Number(params.get("sunsetAngle")), null, "sunset");


  if (paramLon && paramLat && paramName) {
    const pos = {
      coords: {
        latitude: paramLat,
        longitude: paramLon
      }
    };
    init(pos, paramName, paramTZ);
  }
  // get current location
  else if (navigator.geolocation) {
    document.body.style.cursor = 'wait';
    navigator.geolocation.getCurrentPosition(init);
    document.body.style.cursor = 'default';
  }
  else {
    console.log("Geolocation is not supported by this browser - using default");
    const pos = {
      coords: {
        latitude: 39.9960522,
        longitude: -105.0908262
      }
    };
    init(pos, "Lafayette, CO", "America/Denver");
  }
}

function init(position, placeName = `(${Math.round(position.coords.latitude*100)/100}, ${Math.round(position.coords.longitude*100)/100})`, tz = null) {
  gLatitude = position.coords.latitude;
  gLongitude = position.coords.longitude;

  if (tz) {
    gFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeStyle: "short",
    });
  }
  else {
    gFormatter = new Intl.DateTimeFormat("en-US", {
      timeStyle: "short"
    });
  }
  document.getElementById("placeName").innerHTML = placeName;

  makeTable();
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
    const moonTitle = curMoonTimes.alwaysUp?'Moon does not set':curMoonTimes.alwaysDown?'Moon does not rise':`Moon rise: ${gFormatter.format(curMoonTimes.rise)}\nMoon set: ${gFormatter.format(curMoonTimes.set)}`;
    
    
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