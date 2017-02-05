import Snap from "snapsvg/dist/snap.svg-min";
import {Calc} from "./calc";
import {zodiac} from "./zodiac";
import {planets} from "./planets";

export class Drawer {
  draw(properties) {
    if (properties.hasOwnProperty('selector')) {
      this.selector = properties.selector;
    } else {
      throw new Error('Irregular selector');
    }

    this.planets = (properties.hasOwnProperty('planets')) ? properties.planets : null;
    this.houses = (properties.hasOwnProperty('houses')) ? properties.houses : null;

    this.s = Snap(this.selector);
    this.s.attr({viewBox: "-50 -50 100 100"});

    this.drawn = {
      circles: this.drawZodiacCircles(),
      degrees: this.drawZodiacDegrees(),
      zodiac: {
        signs: this.drawZodiacSigns(properties.zodiac.start.sign, properties.zodiac.start.degree),
        ascendant: {
          signIndex: properties.zodiac.start.sign,
          correctedByDegrees: properties.zodiac.start.degree,
        }
      },
      houses: {
        axes: this.drawHousesAxes(),
        meta: this.houses
      },
      planets: [
        this.drawSun(),
        this.drawMercury(),
        this.drawVenus(),
        this.drawMars(),
        this.drawMoon(),
        this.drawJupiter(),
        this.drawSaturn(),
        this.drawUranus(),
        this.drawNeptune(),
        this.drawPluto()
      ]
    };

    // drawn.planets = this.correctCollidingPlanets(drawn.planets);

    return this.drawn;
  }

  describeArc(radius, startDegree, endDegree) {

    const start = Calc.getPointOnCircle(radius, endDegree);
    const end = Calc.getPointOnCircle(radius, startDegree);
    const largeArcFlag = endDegree - startDegree <= 180 ? "0" : "1";

    const d = [
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;
  }

  drawZodiacCircles() {
    const circles = {
      outer: this.s.circle(0, 0, zodiac.radius.outer),
      inner: this.s.circle(0, 0, zodiac.radius.inner),
      innerAuxiliary: this.s.circle(0, 0, zodiac.radius.innerAuxiliary)
    }
    
    circles.outer.addClass("zodiac-circle-outer");
    circles.inner.addClass("zodiac-circle-inner");
    circles.innerAuxiliary.addClass("zodiac-circle-inner-auxiliary");

    return circles;
  }

  drawZodiacDegrees() {
    const degrees = [];

    for (let degree = 0; degree < 360; degree++) {
      const radius = zodiac.radius.innerAuxiliary;
      const offsetFromRadius = 1;

      const point1 = Calc.getPointOnCircle(radius, degree);
      const point2 = Calc.getPointOnCircle(radius, degree, offsetFromRadius);

      const zodiacDegree = this.s.line(point1.x, point1.y, point2.x, point2.y);
      zodiacDegree.attr({
        index: degree
      });
      zodiacDegree.addClass("zodiac-degree");
      zodiacDegree.addClass("zodiac-degree-" + degree);

      degrees.push({
        meta: {
          degree,
          point1,
          point2
        },
        zodiacDegree
      });
    }

    return degrees;
  }

  drawZodiacSigns(startSign, signDegree) {
    const zodiacSignImageWidth = 3;
    const zodiacSignImageHeight = 3;

    const signs = [];

    const ascendantDegreeCorrection = zodiac.validateSignDegree(signDegree);
    const startSignIndex = zodiac.getStartSignIndex(startSign);

    for (let sign = 0; sign <= 11; sign++) {
      let signIndex = null;
      const regularIndex = startSignIndex + sign;
      const isIndexOutOfBound = (regularIndex > 11);
      if (isIndexOutOfBound) {
        signIndex = regularIndex - 12;
      } else {
        signIndex = regularIndex;
      }
      const signObj = zodiac.signs[signIndex];

      const degree = sign * 30 - ascendantDegreeCorrection;
      const degreeBetweenSigns = degree + 15;
      const degreePreviousSign = degree - 30;
      const degreeNextSign = degree + 30;

      const topLeftPoint = Calc.getPointOnCircle(zodiac.radius.outer, degree);
      const topRightPoint = Calc.getPointOnCircle(zodiac.radius.innerAuxiliary, degree);
      const rightArcDescription = this.describeArc(zodiac.radius.innerAuxiliary, degreeNextSign, degree);
      const bottomLeftPoint = Calc.getPointOnCircle(zodiac.radius.outer, degreeNextSign);
      const leftArcDescription = this.describeArc(zodiac.radius.outer, degreeNextSign, degree);

      const zodiacSignBackground = this.s.path([
        "M", topLeftPoint.x, topLeftPoint.y,
        "L", topRightPoint.x, topRightPoint.y,
        rightArcDescription,
        "L", bottomLeftPoint.x, bottomLeftPoint.y,
        "M", topLeftPoint.x, topLeftPoint.y,
        leftArcDescription,
        "M", topLeftPoint.x, topLeftPoint.y,
        "Z"
      ].join(" "));

      const signElementClass = "zodiac-sign-element-" + signObj.element;
      const signNameClass = "zodiac-sign-" + signObj.name.toLowerCase();
      zodiacSignBackground.addClass("zodiac-sign");
      zodiacSignBackground.addClass(signElementClass);
      zodiacSignBackground.addClass(signNameClass);

      const zodiacSignPosition = Calc.getPointOnCircle(zodiac.radius.betweenOuterInner, degreeBetweenSigns)
      const zodiacSignImagePositionX = zodiacSignPosition.x - zodiacSignImageWidth / 2;
      const zodiacSignImagePositionY = zodiacSignPosition.y - zodiacSignImageHeight / 2;
      const zodiacSignSymbol = this.s.image(signObj.imageUrl, zodiacSignImagePositionX, zodiacSignImagePositionY, zodiacSignImageWidth, zodiacSignImageHeight);

      const meta = {};
      Object.assign(meta, signObj);
      meta['degree'] = {
        self: degree,
        nextSign: degreeNextSign,
        previousSign: degreePreviousSign
      };
      meta['position'] = zodiacSignPosition;

      signs.push({
        meta,
        symbol: zodiacSignSymbol,
        background: zodiacSignBackground
      });
    }
    return signs;
  }

  drawHousesAxes() {
    const axis = [];

    const ascendantDescendantAxis = this.drawAscendantDescendantAxis();
    axis.push(ascendantDescendantAxis);

    const house2house8Axis = this.drawHouse2House8Axis();
    axis.push(house2house8Axis);

    const house3house9Axis = this.drawHouse3House9Axis();
    axis.push(house3house9Axis);

    const immumMediumCoelliAxis = this.drawImmumMediumCoelliAxis();
    axis.push(immumMediumCoelliAxis);

    const house5house11Axis = this.drawHouse5House11Axis();
    axis.push(house5house11Axis);

    const house6house12Axis = this.drawHouse6House12Axis();
    axis.push(house6house12Axis);

    return axis;
  }

  drawAscendantDescendantAxis() {
    const ascendantDegree = (this.houses.hasOwnProperty('house1') && this.houses.house1.hasOwnProperty('degree')) ? this.houses.house1.degree : null;
    const ascendantPoint = Calc.getPointOnCircle(zodiac.radius.outer, ascendantDegree, -2);
    const descendantPoint = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(ascendantDegree), -2);
    const ascendantDescendantAxis = this.s.line(ascendantPoint.x, ascendantPoint.y, descendantPoint.x, descendantPoint.y);
    ascendantDescendantAxis.addClass("house-axis");
    ascendantDescendantAxis.addClass("house-axis-ascendant-descendant");
    return ascendantDescendantAxis;
  }

  drawHouse2House8Axis() {
    const house2Degree = (this.houses.hasOwnProperty('house2') && this.houses.house2.hasOwnProperty('degree')) ? this.houses.house2.degree : null;
    const house2Point = Calc.getPointOnCircle(zodiac.radius.outer, house2Degree, -2);
    const house8Point = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(house2Degree), -2);
    const house2house8Axis = this.s.line(house2Point.x, house2Point.y, house8Point.x, house8Point.y);
    house2house8Axis.addClass("house-axis");
    house2house8Axis.addClass("house-axis-2-8");
    return house2house8Axis;
  }

  drawHouse3House9Axis() {
    const house3Degree = (this.houses.hasOwnProperty('house3') && this.houses.house3.hasOwnProperty('degree')) ? this.houses.house3.degree : null;
    const house3Point = Calc.getPointOnCircle(zodiac.radius.outer, house3Degree, -2);
    const house9Point = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(house3Degree), -2);
    const house3house9Axis = this.s.line(house3Point.x, house3Point.y, house9Point.x, house9Point.y);
    house3house9Axis.addClass("house-axis");
    house3house9Axis.addClass("house-axis-3-9");
    return house3house9Axis;
  }

  drawImmumMediumCoelliAxis() {
    const immumCoelliDegree = (this.houses.hasOwnProperty('house4') && this.houses.house4.hasOwnProperty('degree')) ? this.houses.house4.degree : null;
    const immumCoelliPoint = Calc.getPointOnCircle(zodiac.radius.outer, immumCoelliDegree, -2);
    const mediumCoelliPoint = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(immumCoelliDegree), -2);
    const immumMediumCoelliAxis = this.s.line(immumCoelliPoint.x, immumCoelliPoint.y, mediumCoelliPoint.x, mediumCoelliPoint.y);
    immumMediumCoelliAxis.addClass("house-axis");
    immumMediumCoelliAxis.addClass("house-axis-immum-medium");
    return immumMediumCoelliAxis;
  }

  drawHouse5House11Axis() {
    const house5Degree = (this.houses.hasOwnProperty('house5') && this.houses.house5.hasOwnProperty('degree')) ? this.houses.house5.degree : null;
    const house5Point = Calc.getPointOnCircle(zodiac.radius.outer, house5Degree, -2);
    const house11Point = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(house5Degree), -2);
    const house5house11Axis = this.s.line(house5Point.x, house5Point.y, house11Point.x, house11Point.y);
    house5house11Axis.addClass("house-axis");
    house5house11Axis.addClass("house-axis-5-11");
    return house5house11Axis;
  }

  drawHouse6House12Axis() {
    const house6Degree = (this.houses.hasOwnProperty('house6') && this.houses.house6.hasOwnProperty('degree')) ? this.houses.house6.degree : null;
    const house6Point = Calc.getPointOnCircle(zodiac.radius.outer, house6Degree, -2);
    const house12Point = Calc.getPointOnCircle(zodiac.radius.outer, Calc.getOppositeDegree(house6Degree), -2);
    const house6house12Axis = this.s.line(house6Point.x, house6Point.y, house12Point.x, house12Point.y);
    house6house12Axis.addClass("house-axis");
    house6house12Axis.addClass("house-axis-6-12");
    return house6house12Axis;
  }

  drawPlanet(planet, degree) {
    const planetImageWidth = 4;
    const planetImageHeight = 4;

    const linePoint1 = Calc.getPointOnCircle(zodiac.radius.inner, degree);
    const linePoint2 = Calc.getPointOnCircle(zodiac.radius.inner, degree, 1);
    const planetAuxiliaryLine = this.s.line(linePoint1.x, linePoint1.y, linePoint2.x, linePoint2.y);
    planetAuxiliaryLine.addClass("planet-auxiliary-line")

    const planetPosition = Calc.getPointOnCircle(zodiac.radius.inner, degree, 3);
    const planetImagePositionX = planetPosition.x - planetImageWidth / 2;
    const planetImagePositionY = planetPosition.y - planetImageHeight / 2;

    let planetSymbolBackgroundRadius = null;
    if (planetImageWidth > planetImageHeight) {
      planetSymbolBackgroundRadius = planetImageWidth / 2;
    } else {
      planetSymbolBackgroundRadius = planetImageHeight / 2;
    }
    const planetSymbolBackground = this.s.circle(planetPosition.x, planetPosition.y, planetSymbolBackgroundRadius);
    planetSymbolBackground.addClass("planet-background");

    const planetSymbol = this.s.image(planet.imageUrl, planetImagePositionX, planetImagePositionY, planetImageWidth, planetImageHeight);

    const meta = {};
    Object.assign(meta, planet);
    meta['degree'] = degree;
    meta['position'] = planetPosition;

    return {
      planet: planetSymbol,
      background: planetSymbolBackground,
      meta
    };
  }

  drawSun() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Sun";
    }), this.planets.sun.degree);
  }

  drawMercury() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Mercury";
    }), this.planets.mercury.degree);
  }

  drawVenus() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Venus";
    }), this.planets.venus.degree);
  }

  drawMars() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Mars";
    }), this.planets.mars.degree);
  }

  drawMoon() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Moon";
    }), this.planets.moon.degree);
  }

  drawJupiter() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Jupiter";
    }), this.planets.jupiter.degree);
  }

  drawSaturn() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Saturn";
    }), this.planets.saturn.degree);
  }

  drawUranus() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Uranus";
    }), this.planets.uranus.degree);
  }

  drawNeptune() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Neptune";
    }), this.planets.neptune.degree);
  }

  drawPluto() {
    return this.drawPlanet(planets.find((elem) => {
      return elem.name == "Pluto";
    }), this.planets.pluto.degree);
  }

  correctCollidingPlanets(planets) {
    let planetsCoordinates = planets.map((planet) => {
      return {
        name: planet.name,
        x: planet.drawing.position.x,
        y: planet.drawing.position.y
      }
    }).sort((a, b) => {
      return a.x > b.x && a.y > b.y;
    });

    return;
  }
}
export let drawer = new Drawer();