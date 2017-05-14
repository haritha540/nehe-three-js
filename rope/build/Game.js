// Generated by CoffeeScript 1.6.2
/*
    SETUP SCENE
*/


(function() {
  var $container;
  var ASPECT, FAR, MAX_RENDER_DT, NEAR, PHYSICS_DT, SCREEN_HEIGHT, SCREEN_WIDTH, VIEW_ANGLE;
  var Particle, Rope, Spring, State, accumulator;
  var currentTime, floor, fpsStats, msStats, gameLoop;
  var gravity, id, nc;
  var camera, pointLight, renderer, rope, running, scene;
  var netCallbackIterations, netClientReady,sendNetworkMessage, t;

  SCREEN_WIDTH = window.innerWidth;
  SCREEN_HEIGHT = window.innerHeight;
  VIEW_ANGLE = 45;
  NEAR = 0.1;
  FAR = 1000;
  ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.set(0, 1.3, 4);

  scene = new THREE.Scene();
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

  $container = $("#container");
  $container.append(renderer.domElement);

  pointLight = new THREE.PointLight(0xFFFFFF);
  pointLight.position.set(0, 10, 20);
  scene.add(pointLight);

  floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 10, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  floor.rotation.x = Math.PI / -2;
  floor.position.y = -0.04;
  scene.add(floor);

  /* FPS AND MS COUNTER (STATS) */
  fpsStats = new Stats();
  fpsStats.setMode(0);
  fpsStats.domElement.style.position = "absolute";
  fpsStats.domElement.style.left = "0px";
  fpsStats.domElement.style.top = "0px";
  document.body.appendChild(fpsStats.domElement);
  msStats = new Stats();
  msStats.setMode(1);
  msStats.domElement.style.position = "absolute";
  msStats.domElement.style.left = "80px";
  msStats.domElement.style.top = "0px";
  document.body.appendChild(msStats.domElement);

  /* CLASSES USED IN THE SIMULATION */
  
  State = (function() {
    function State(pos, vel) {
      this.pos = pos;
      this.vel = vel;
    }

    State.prototype.set = function(state) {
      this.pos.set_v(state.pos);
      return this.vel.set_v(state.vel);
    };

    return State;
  })();

  Particle = (function() {
    var acceleration;

    function Particle(mass) {
      this.mass = mass;
      this.curState  = new State(new NH.Vec3(0, 0, 0), new NH.Vec3(0, 0, 0));
      this.prevState = new State(this.curState.pos.copy(), this.curState.vel.copy());
      this.forces = new NH.Vec3(0, 0, 0);
    }

    Particle.prototype.applyForce = function(force) {
      return this.forces.add(force);
    };

    acceleration = function(forces, mass) {
      return forces.devidedWith_s(mass);
    };

    Particle.prototype.update = function(dt) {
      this.prevState.set(this.curState);
      this.curState.vel.add(acceleration(this.forces, this.mass).times_s(dt));
      return this.curState.pos.add(this.curState.vel.times_s(dt));
    };

    return Particle;
  })();

  Spring = (function() {
    function Spring( particle1, particle2, springConstant, springLen, friction ) {
      this.particle1 = particle1;
      this.particle2 = particle2;
      this.springConstant = springConstant;
      this.springLen = springLen;
      this.friction = friction;
    }

    Spring.prototype.solve = function() {
      var force, len, springVector;

      springVector = this.particle2.curState.pos.minus(this.particle1.curState.pos);
      len = springVector.length();
      force = new NH.Vec3(0, 0, 0);
      if (len !== 0) {
        force.add(springVector.unit().times_s(len - this.springLen).times_s(this.springConstant));
      }

      force.add(this.particle1.curState.vel.minus(this.particle2.curState.vel).times_s(-this.friction));
      if (this.particle1.head !== true) {
        this.particle1.applyForce(force);
      }

      return this.particle2.applyForce(force.times_s(-1));
    };

    return Spring;

  })();

  Rope = (function() {
    function Rope(args) {
      var i, lineGeom, lineMat, particle, pos, shadowGeom, shadowMat, mass, numParticles;
      var springConstant, springFriction, springLen;

      numParticles = args.numOfParticles || 30;
      mass = args.mass || 0.05;
      springConstant = args.springConstant || 1000;
      springLen = args.springLen || 0.05;
      springFriction = args.springFriction || 0.5;
      this.gravitation = args.gravitation || 9.82;
      this.airFriction = args.airFriction || 0.04;
      this.groundRepulsion = args.groundRepulsion || 100;
      this.groundFriction = args.groundFriction || 0.2;
      this.groundAbsorption = args.groundAbsorption || 2;

      this.particles = [];

      for (i = 0; i < numParticles; i++ ) {
        this.particles[i] = new Particle(mass);
      }

      for (i = 0; i<this.particles.length;  i++ ) {
        particle = this.particles[i];
        particle.curState.pos.x = i * springLen;
        particle.curState.pos.y = this.particles.length * springLen * (2 / 3);
      }

      this.particles[0].head = true;
      this.springs = [];

      for ( i = 0; i<(numParticles - 1); i++ ) {
        this.springs[i] = new Spring(this.particles[i], this.particles[i + 1],
        springConstant, springLen, springFriction);
      }

      lineMat = new THREE.LineBasicMaterial({ color: 0x005cd9, linewidth: 1 });
      lineGeom = new THREE.Geometry();
      shadowMat = new THREE.LineBasicMaterial({ color: 0xbbbbbb, linewidth: 1 });
      shadowGeom = new THREE.Geometry();

      for ( i=0; i<this.particles.length; i++ ) {
        particle = this.particles[i];
        pos = particle.curState.pos;
        lineGeom.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        shadowGeom.vertices.push(new THREE.Vector3(pos.x, -0.02, pos.z));
      }
      this.line = new THREE.Line(lineGeom, lineMat);
      this.shadow = new THREE.Line(shadowGeom, shadowMat);
      scene.add(this.line);
      scene.add(this.shadow);
    }

    Rope.prototype.update = function(dt) {
      var force, i, particle, spring, vec, results;
        
      for (i = 0; i<this.particles.length; i++ ) {
        particle = this.particles[i];
        particle.forces.set_s(0, 0, 0);
      }

      for ( i = 0; i<this.springs.length; i++ ) {
        spring = this.springs[i];
        spring.solve();
      }

      for ( i = 0; i<=this.particles.length - 1; i++ ) {
        if (i !== 0) {
          this.particles[i].applyForce(this.gravitation.times_s(this.particles[i].mass));
          this.particles[i].applyForce(this.particles[i].curState.vel.times_s(-this.airFriction));
        }
      }

      for ( i = 0; i<this.particles.length; i++ ) {
        particle = this.particles[i];
        if (particle.curState.pos.y < 0) {
          vec = new NH.Vec3(0, 0, 0);
          vec.set_v(particle.curState.vel);
          vec.y = 0;
          particle.applyForce(vec.times_s(-this.groundFriction));
          vec.y = particle.curState.vel.y;
          vec.x = 0;
          vec.z = 0;
          if (vec.y < 0) {
            particle.applyForce(vec.times_s(-this.groundAbsorption));
          }

          force = new NH.Vec3(0, this.groundRepulsion, 0).times_s(0 - particle.curState.pos.y);
          particle.applyForce(force);
        }
      }

      results = [];
      for ( i = 0; i<this.particles.length; i++ ) {
        particle = this.particles[i];
        results.push(particle.update(dt));
      }
      return results;
    };

    Rope.prototype.render = function(blending) {
      var currPos, i, prevPos, renderPos, _i, _ref;

      for (i =  0; i<this.particles.length; i++ ) {
        prevPos = this.particles[i].prevState.pos;
        currPos = this.particles[i].curState.pos;
        renderPos = currPos.times_s(blending).plus(prevPos.times_s(1 - blending));

        this.line.geometry.vertices[i].set(renderPos.x, renderPos.y, renderPos.z);
        this.shadow.geometry.vertices[i].set(renderPos.x, -0.02, renderPos.z);
      }

      this.line.geometry.verticesNeedUpdate = true;
      this.shadow.geometry.verticesNeedUpdate = true;
    };

    return Rope;
  })();


  /* SIMULATION VARIABLES */

  PHYSICS_DT = 2;
  MAX_RENDER_DT = 1000 / 30;

  t = 0;

  currentTime = performance.now();

  accumulator = 0;

  gravity = new NH.Vec3(0, -9.82, 0);

  rope = new Rope({
    numOfParticles: 50,
    mass: 0.05,
    springConstant: 12000,
    springLen: 0.05,
    springFriction: 0.5,
    gravitation: gravity,
    airFriction: 0.04,
    groundRepulsion: 100,
    groundFriction: 0.2,
    groundAbsorption: 2
  });

  /* GAME LOOP */

  gameLoop = function() {
    var blending, frameTime, newTime;

    fpsStats.begin();
    msStats.begin();
    newTime = performance.now();
    frameTime = Math.min(newTime - currentTime, MAX_RENDER_DT);
    currentTime = newTime;
    accumulator += frameTime;
    while (accumulator >= PHYSICS_DT) {
      rope.update(PHYSICS_DT / 1000);
      t += PHYSICS_DT;
      accumulator -= PHYSICS_DT;
    }

    blending = accumulator / PHYSICS_DT;
    rope.render(blending);

    renderer.render(scene, camera);
    fpsStats.end();
    msStats.end();

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);

  /*
      KEYBOARD INPUT
  */

  NH.Keyboard.bind("press", {
    key: 39,
    callback: (function() {
      return rope.particles[0].curState.vel.x += 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 39,
    callback: (function() {
      return rope.particles[0].curState.vel.x -= 1;
    })
  });

  NH.Keyboard.bind("press", {
    key: 37,
    callback: (function() {
      return rope.particles[0].curState.vel.x -= 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 37,
    callback: (function() {
      return rope.particles[0].curState.vel.x += 1;
    })
  });

  NH.Keyboard.bind("press", {
    key: 38,
    callback: (function() {
      return rope.particles[0].curState.vel.z -= 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 38,
    callback: (function() {
      return rope.particles[0].curState.vel.z += 1;
    })
  });

  NH.Keyboard.bind("press", {
    key: 40,
    callback: (function() {
      return rope.particles[0].curState.vel.z += 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 40,
    callback: (function() {
      return rope.particles[0].curState.vel.z -= 1;
    })
  });

  NH.Keyboard.bind("press", {
    key: 33,
    callback: (function() {
      return rope.particles[0].curState.vel.y += 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 33,
    callback: (function() {
      return rope.particles[0].curState.vel.y -= 1;
    })
  });

  NH.Keyboard.bind("press", {
    key: 34,
    callback: (function() {
      return rope.particles[0].curState.vel.y -= 1;
    })
  });

  NH.Keyboard.bind("release", {
    key: 34,
    callback: (function() {
      return rope.particles[0].curState.vel.y += 1;
    })
  });

}).call(this);
