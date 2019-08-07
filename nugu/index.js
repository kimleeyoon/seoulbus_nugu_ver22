/*
 * 버스 도착 정보 API제공 : 공공데이터포털[https://www.data.go.kr]
 * 사용 모듈 :  스크래핑 모듈 request-promise xml2
 *             npm i request request-promise xml2js
 * 
 * 버스 정류소ID 참조 : http://topis.seoul.go.kr/excel/stationlist.xlsx
 * 버스 노선ID, 정류소순번 정보 참조 : http://topis.seoul.go.kr/map/openBusMap.do#
 */
// request: http 읽어오는 모듈
//http://ws.bus.go.kr/api/rest/stationinfo/getLowStationByUid?ServiceKey=인증키&arsId=02105
const {
  promisify
} = require('util')
const parseString = promisify(require('xml2js').parseString) //xml파일을 파싱하는 코드
const rp = require('request-promise')

/*var args = process.argv
var arsId= args[2]*/

function getData(cityName) {
  return new Promise((resolve, reject) => {
    loc(cityName)
      .then((loc) => {
        locationData = loc;
        return Promise.all([
          weather(loc),
          aqi(loc),
          getRegion(loc)
        ])
      })
      .then((data) => {
        console.log("weather, aqi, regionCode 옴");
        data[4] = locationData;
        return weatherByCode(data);
      })
      .then((data) => {
        console.log("데이터 처리 완료");
        resolve(data);
      })
      .catch((error) => {
        console.error(error);
        reject();
      });
  });

}

class Request {
  constructor(httpReq) {
    // console.log(httpReq.body);
    this.action = httpReq.body.action;
  }
  actionRequest(response, sendData) {
    let actionName = this.action.actionName;
    let parameters = this.action.parameters;

    getBusTime(parameters.AarsId, parameters.AM_RTNM)
      .then((data) => response.setParameters(data, sendData))
      .catch((err) => console.log(err));

    // getData(parameters.cityName.value)
    // .then((data) => {
    //     console.log("reqObject"); 
    //     let afterData = {
    //         weather : {},
    //         aqi : {},
    //         regionCode : {},
    //         koreaWeather : {},
    //         location : {}
    //     };
    //     [afterData.weather, afterData.aqi, afterData.regionCode, afterData.koreaWeather, afterData.location] = data; // 수정해야함
    //     console.log(afterData);
    //     response.setParameters(afterData, sendData);
    // })
    // .catch(() => {
    //     console.log("getData Promise Error");
    //     response.setParameters(null, sendData);
    // });
  }
}

class Response {
  constructor() {
    this.version = '2.0';
    this.resultCode = 'OK';
    this.output = {};
    this.directives = [];
  }
  setParameters(result, sendData) {
    if (result) {
      this.output = result;
    } else {
      this.resultCode = "Error";
    }
    sendData();
  }
}

const reqObject = (req, res, next) => {
  response = new Response();
  request = new Request(req);
  request.actionRequest(response, () => res.send(response));
};

const serviceKey = 'QBHiO9kndqzdxwEal7fqXwhCZmm6LnVTZ%2F1J%2BF9o6%2F9JftwDQUVjPUhTilDn4U7FLnjkevwhS%2BvXOIgQJxGBvw%3D%3D'

function getBusTime(arsId, M_rtNm) { // 버스정류소 ID, 버스번호

  const url1 = (arsId) => `http://ws.bus.go.kr/api/rest/stationinfo/getLowStationByUid?ServiceKey=${serviceKey}&arsId=${arsId}`
  rp(url1(arsId))
    .then(parseString)
    .then(function (data) {
      for (var i = 0; i < data.ServiceResult.msgBody[0].itemList.length; i++) {
        if (data.ServiceResult.msgBody[0].itemList[i].rtNm == M_rtNm) { //인자로 받은 버스 번호와 유저가 검색하고자 하는 버스번호가 같을경우
          let M_stnNm = data.ServiceResult.msgBody[0].itemList[0].stnNm //버스정류소 이름
          let M_arrmg1 = data.ServiceResult.msgBody[0].itemList[i].arrmsg1 //첫 번째 버스 도착 예정시간
          let M_arrmg2 = data.ServiceResult.msgBody[0].itemList[i].arrmsg2 //두 번째 버스 도착 예정시간
          return new Promise((resolve, reject) => {
            resolve({
              M_rtNm: M_rtNm,
              M_stnNm: M_stnNm,
              M_arrmg1: M_arrmg1,
              M_arrmg2: M_arrmg2,
            });
          });
        }
      }
    })

  // return (M_rtNm, M_stnNm, M_arrmg1, M_arrmg2)
}

module.exports = reqObject;




/*
console.log("정류소명:"+data.ServiceResult.msgBody[0].itemList[0].stnNm)
console.log("")
for (var i=0; i<data.ServiceResult.msgBody[0].itemList.length; i++) {
  console.log((i+1)+"번째 버스명:  "+ data.ServiceResult.msgBody[0].itemList[i].rtNm)
  console.log("")
  console.log("첫번째 버스는 "+data.ServiceResult.msgBody[0].itemList[i].arrmsg1+" 후에 도착")
  console.log("두번째 버스는 "+data.ServiceResult.msgBody[0].itemList[i].arrmsg2+" 후에 도착")
  console.log("") 
  console.log("-------------------------------------------------")
*/

// module.exports = getBusTime;