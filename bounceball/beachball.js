/**
 *  @author rkwright   /  http://www.geofx.com
 */

var BALL = { revision: '01' };

//some constants
var RESTITUTION     = 0.75;
var SEGMENTS        = 6;
var BASE_VELOCITY_V = 0.05;
var BASE_VELOCITY_H = 0.025;
var MIN_RHO         = 60.0 * Math.PI / 180.0;
var DELTA_RHO       = 30.0 * Math.PI / 180.0;
var BASE_RADIUS     = 0.1;
var DELTA_RADIUS    = 0.01;

BALL.BeachBall = function ( parameters ) {
	
	this.gravity  = new THREE.Vector3(0, -0.001, 0);
	this.vel      = new THREE.Vector3(0,0,0);
	this.loc      = new THREE.Vector3(0,0,0);
    this.radius   = 0;
    this.xLimit   = 0;
    this.zLimit   = 0;
    this.mesh     = null;

    this.setParameters( parameters );

    this.init();
};

// the scene's parameters from the values JSON object
// lifted from MrDoob's implementation in three.js
BALL.BeachBall.prototype = {
		
	setParameters: function( values ) {

		if ( values === undefined ) return;
	
		for ( var key in values ) {
	
			var newValue = values[ key ];
	
			if ( newValue === undefined ) {
				console.warn( "BALL: '" + key + "' parameter is undefined." );
				continue;
			}
	
			if ( key in this ) {
				var currentValue = this[ key ];
	
				if ( currentValue instanceof THREE.Color ) {
					currentValue.set( newValue );
				}
                else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {
					currentValue.copy( newValue );
				}
                else if (currentValue instanceof Array) {
                    this[ key ] = newValue.slice();
				}
                else {
                    this[ key ] = newValue;
                }
			}
		}
	},

    /**
     * Initialize all the parameters of the beachball
     */
	init: function () {
        this.radius = BASE_RADIUS;  // + DELTA_RADIUS * Math.random();

        var geometry = new THREE.SphereGeometry( this.radius, SEGMENTS, SEGMENTS );

        var material = new THREE.MeshLambertMaterial();
        material.color.setRGB(Math.random(), Math.random(), Math.random());

        var theta = Math.PI * 2.0 * Math.random();
        var velX = Math.sin(theta) * BASE_VELOCITY_H;
        var velZ = Math.cos(theta) * BASE_VELOCITY_H;

        var rho = MIN_RHO + DELTA_RHO * Math.random();
        var velY = Math.sin(rho) * BASE_VELOCITY_V;

        this.vel.set( velX, velY, velZ);
        this.loc.set(0, this.radius, 0);

        this.mesh = new THREE.Mesh( geometry, material );
        //this.mesh.position.set(0, this.radius, 0);
    },


/**
 * Update the ball's location and velocity as well as its life-force
 */
	update: function() {

        this.loc.add( this.vel );
        this.vel.add( this.gravity );
        this.mesh.position.set(this.loc.x, this.loc.y, this.loc.z);

        console.log(" veloc: " + this.vel.x.toFixed(3) + ", " + this.vel.y.toFixed(3) + ", " + this.vel.z.toFixed(3) + ", loc: " + this.loc.x.toFixed(3) + ", " + this.loc.y.toFixed(3) + ", "+ this.loc.z.toFixed(3));

    if (this.loc.y < 0.0) {
            this.vel.y = -this.vel.y * RESTITUTION;
            this.loc.y = this.radius;
        }
	}
};
