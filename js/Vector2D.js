/*
** A very simple, feature-limited vector class to simplify some speed and 
** direction calculations in the Copter taxi simulation game.
*/

function Vector2D(x, y){
	this.x = x;
	this.y = y;
}

// Return the magnitude of this vector instance
Vector2D.prototype.magnitude = function(){
	return Math.sqrt( this.x * this.x + this.y * this.y );
};

// Return a vector that is the sum of this vector instance and vector v.
Vector2D.prototype.add = function(v){
	return new Vector2D( this.x + v.x, this.y + v.y );
};

// Return a vector that is the difference of this vector instance and vector v.
Vector2D.prototype.subtract = function(v){
	return new Vector2D( this.x - v.x, this.y - v.y );
};

// Return a unit vector with same direction as this vector instance
Vector2D.prototype.normalize = function(){
	var mag = this.magnitude();
	if ( mag === 0 ) { 
		return new Vector2D( 0, 0 ); 
	}
	return new Vector2D( this.x / mag, this.y / mag );
};

// Return vector angle, in radians
Vector2D.prototype.angle = function(){
	return Math.atan2( this.y, this.x );
};

// Return a new vector equivalent to this vector instance
Vector2D.prototype.clone = function(){
	return new Vector2D(this.x, this.y);
};

// Return a new vector equivalent to this vector instance
Vector2D.prototype.scale = function(factor){
	return new Vector2D(this.x * factor, this.y * factor);
};

// Return a new vector normal to this vector instance
Vector2D.prototype.normal = function(){
	return new Vector2D(-this.y, this.x);
};

// Return the dot product of this vector instance with another vector v.
// The result is a scalar that can be considered the projection of v 
// in the direction of this vector instance.
Vector2D.prototype.dot = function(v){
	return (this.x * v.x) + (this.y * v.y);
};
