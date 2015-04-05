/*
** Implements a ride request. Methods to change request status
** capture date/time details for reporting purposes.
*/
function RideRequest(name, city, zip, pickupLat, pickupLng, dropoffLat, dropoffLng){
  this.name = name;
  this.city = city;
  this.zip = zip;
  this.readyForPickup = false;

  this.pickupLat = pickupLat;
  this.pickupLng = pickupLng;

  this.dropoffLat = dropoffLat;
  this.dropoffLng = dropoffLng;

  this.setNotReady();
}

/* Request status "constants" */
RideRequest.statusNotReady  = "Not Ready";
RideRequest.statusReady     = "Ready";
RideRequest.statusInTransit = "In Transit";
RideRequest.statusDelivered = "Delivered";


RideRequest.prototype.isReady = function(){
  return this.readyForPickup;
};

RideRequest.prototype.setNotReady = function(){
  //console.log( 'setNotReady called for ' + this.name );
  this.status = RideRequest.statusNotReady;
  this.readyAt = null;
  this.inTransitAt = null;
  this.deliveredAt = null;
};

RideRequest.prototype.setReady = function(){
  //console.log( 'setReady called for ' + this.name );
  this.status = RideRequest.statusReady;
  this.readyForPickup = true;
  this.readyAt = new Date();
};

RideRequest.prototype.setInTransit = function(){
  //console.log( 'setInTransit called for ' + this.name );
  this.status = RideRequest.statusInTransit;
  this.inTransitAt = new Date();
};

RideRequest.prototype.setDelivered = function(){
  //console.log( 'setDelivered called for ' + this.name );
  this.status = RideRequest.statusDelivered;
  this.deliveredAt = new Date();
};
