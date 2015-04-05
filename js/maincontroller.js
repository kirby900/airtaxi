/*
** Date.now() shim for older browsers that don't have it.
*/
if (!Date.now) {
  Date.now = function now() {
    return new Date().getTime();
  };
}

var app = angular
    .module('heli',[])
    .controller('MainController',function($scope,$timeout){

        var targetLat = 33.484467;
        var targetLng = -111.97536;

        $scope.windConditions = windConditions;

        $scope.copters = [
          new Copter( "Copter 1", 33.2, -112.2, 3, 2500 ),
          new Copter( "Copter 2", 33.4, -111.95, 3, 2500 ),
          new Copter( "Copter 3", 33.6, -111.7, 3, 2500 )
        ];

        $scope.animationIntervals = [
          { intervalMs: 10000, label: '0.1 Hz' },
          { intervalMs: 1000,  label: '1 Hz' },
          { intervalMs: 100,   label: '10 Hz' },
          { intervalMs: 50,    label: '20 Hz' }
        ];

        $scope.timeFactors = [
          { factor: 1,   label: '1x' },
          { factor: 10,  label: '10x' },
          { factor: 25,  label: '25x' },
          { factor: 60,  label: '60x' }
        ];

        $scope.selections = {};
        $scope.selections.windVector = $scope.windConditions[4];
        $scope.selections.animationInterval = $scope.animationIntervals[3];
        $scope.selections.timeFactor = $scope.timeFactors[0];
        $scope.elapsedTime = "";

        $scope.passengers = [];
        persons.forEach(function(p){
          $scope.passengers.push( new RideRequest(p.name, p.city, p.zip, p.lat, p.lng, targetLat, targetLng ) );
        });

        //$scope.requestQueue = new Queue();
        $scope.requestQueue = [];

        $scope.startMs = null;

        var mapOptions = {
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          center: new google.maps.LatLng(targetLat, targetLng),
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        $scope.map = new google.maps.Map(document.getElementById('map1'), mapOptions);        
        $scope.bounds = new google.maps.LatLngBounds();  

        $scope.passengerMarkers = [];
        $scope.copterMarkers = [];

        // Put a marker on the map at the target
        var targetLatLng = new google.maps.LatLng(targetLat, targetLng);
        $scope.bounds.extend(targetLatLng);

        $scope.targetMarker = new google.maps.Marker({
          position: targetLatLng,
          icon: 'image/target.gif',
          map: $scope.map,
          title: 'The target',
          clickable: false
        });


        // Create a marker for each passenger, add a click event handler, 
        // and make the marker watch the passenger's status.
        $scope.passengers.forEach(function(passenger){
          var myLatLng = new google.maps.LatLng(passenger.pickupLat, passenger.pickupLng);
          $scope.bounds.extend(myLatLng);

          // Create a marker for this passenger, using a person icon
          //var marker = createMarker( $scope.map, myLatlng, passenger.name, 'image/Person.png' );
          var marker = new google.maps.Marker({
            position: myLatLng,
            icon: 'image/Person.png',
            map: $scope.map,
            title: passenger.name,
            clickable: true
          });

          // Add a one-time click handler on the passenger marker.
          // If user clicks on a passenger marker, passenger status
          // is updated to Ready.
          google.maps.event.addListenerOnce(marker, 'click', function() {
            console.log ('clicked marker ' + marker.title);

            // Put calls inside $apply so that Angular knows about the changes.
            $scope.$apply(function(){
              passenger.setReady();
              //$scope.requestQueue.enqueue( passenger );
              $scope.requestQueue.push( passenger );

              if ( ! $scope.startMs ){
                $scope.startMs = Date.now();
              }
            }); 
          });


          // Add watcher on passenger status. Whenever it changes, update marker accordingly.
          $scope.$watch(function(){ 
            return passenger.status; 
          }, function(){
            if ( passenger.status === RideRequest.statusNotReady ) {
              marker.setMap( $scope.map );
              marker.setAnimation( null );
              marker.setPosition({ lat: passenger.pickupLat, lng: passenger.pickupLng });
            }
            else if ( passenger.status === RideRequest.statusReady ) {
              //marker.setMap( $scope.map );
              //marker.setPosition({ lat: passenger.current.lat, lng: passenger.current.lng });
              marker.setAnimation( google.maps.Animation.BOUNCE );
            }
            else if ( passenger.status === RideRequest.statusInTransit ) {
              //marker.setPosition({ lat: passenger.current.lat, lng: passenger.current.lng });
              marker.setMap( null );
              marker.setAnimation( null );
            }
            else if ( passenger.status === RideRequest.statusDelivered ) {
              marker.setPosition({ lat: passenger.dropoffLat, lng: passenger.dropoffLng });
              marker.setAnimation( null );
              marker.setMap( $scope.map );
            }
          });

          $scope.passengerMarkers.push (marker);
        });


        $scope.copters.forEach(function(copter){
          var myLatLng = new google.maps.LatLng(copter.current.lat, copter.current.lng);
          $scope.bounds.extend(myLatLng);

          //var marker = createMarker( $scope.map, myLatlng, copter.name, 'image/helicopter.png' );
          var marker = new google.maps.Marker({
            position: myLatLng,
            icon: 'image/black-helicopter-48.png',
            map: $scope.map,
            title: copter.name,
            clickable: false
          });

          // Watch the copter's position. Whenever it changes, update the marker's position.
          $scope.$watch(function(){ 
            return copter.current.lat + '/' + copter.current.lng;
          }, function(){
            marker.setPosition({ lat: copter.current.lat, lng: copter.current.lng });
          });

          $scope.copterMarkers.push(marker);
        });

        $scope.map.fitBounds( $scope.bounds );


/*******************************************************************************
  Animation loop. In a nutshell, it does the following:

  1. Copters: process dropoffs
  2. Dispatcher: assign new pickup to copters
  3. Copters: process pickups
  3. Copters: pick best destination
  4. Copters: move
*******************************************************************************/
var timings = [];

    function animate(){
      //var beginMs = Date.now();
      var beginMs = performance.now();

      if ( $scope.startMs ){
        $scope.elapsedTime = formatElapsed( Date.now() - $scope.startMs );
      }

      $scope.copters.forEach(function(copter){
        copter.processDropoffs();
      });

      // Select copters with unbooked seats
      var availableCopters = $scope.copters.filter(function(copter){
          return copter.isAvailable();
      });

      // Assign as many requests to copters as possible
      //while ( $scope.requestQueue.getLength()  &&  availableCopters.length ){
      while ( $scope.requestQueue.length  &&  availableCopters.length ){
        //console.log('Found request in queue');

        //var rqst = $scope.requestQueue.dequeue();
        var rqst = $scope.requestQueue.shift();


        // Pick a copter, sorting first for idle copters, then by distance
        availableCopters.sort(function(a,b){
          var 
            distA = distanceBetweenGeoPoints( rqst.pickupLat, rqst.pickupLng, a.current.lat, a.current.lng ),
            distB = distanceBetweenGeoPoints( rqst.pickupLat, rqst.pickupLng, b.current.lat, b.current.lng ),
            score = distA - distB;

          // Weight in favor of copters with more capacity
          score += 5 * ( a.getAssignedCount() - b.getAssignedCount() );
          return score;
        });

        $scope.$apply(function(){
          availableCopters[0].addPickup( rqst );
        });

        // Reevaluate which copters have availability
        availableCopters = $scope.copters.filter(function(copter){
          return copter.isAvailable();
        });
      }


      // Move copters to new position
      var simTimeMs = $scope.selections.animationInterval.intervalMs * $scope.selections.timeFactor.factor;

      $scope.copters.forEach(function(copter){
        copter.processPickups();
        copter.adjustTarget();

        var 
          headingVector, 
          distLatMiles, 
          distLngMiles, 
          courseVector, 
          windVector = new Vector2D( $scope.selections.windVector.vx, $scope.selections.windVector.vy );
        var newLat, newLng;

        if ( copter.target ) {
            distLatMiles = calcLatMiles(copter.current.lat, copter.target.lat);
            distLngMiles = calcLngMiles(copter.current.lng, copter.target.lng);
            courseVector = new Vector2D( distLngMiles, distLatMiles );

            var computedHeading =
              computeHeading( 
                courseVector.x,
                courseVector.y,
                windVector.x, 
                windVector.y, 
                copter.maxSpeed);
          headingVector = new Vector2D( computedHeading.x, computedHeading.y );

          var resultant = headingVector.add( windVector );
          var scaledResultant = resultant.scale( simTimeMs / 3600000 );

          if ( courseVector.magnitude() > scaledResultant.magnitude() ) {
            newLat = copter.current.lat + convertLatMilesToDegrees( scaledResultant.y );
            newLng = copter.current.lng + convertLngMilesToDegrees( scaledResultant.x );
          } else {
            newLat = copter.target.lat;
            newLng = copter.target.lng;
          }
        } else {
          // No target for helicopter. Let it move with the wind.
          var scaledResultant = windVector.scale( simTimeMs / 3600000 );
          newLat = copter.current.lat + convertLatMilesToDegrees( scaledResultant.y );
          newLng = copter.current.lng + convertLngMilesToDegrees( scaledResultant.x );
        }

        copter.setLocation( newLat, newLng );

      });

      var undeliveredPassengers = $scope.passengers.filter(function(passenger){
        return passenger.status !== RideRequest.statusDelivered;
      });

      //var endMs = Date.now();
      var endMs = performance.now();
      //console.log( 'begin=' + beginMs + ', end=' + endMs + ', elapsed=' + (endMs - beginMs) );
      timings.push( endMs - beginMs );

      if ( undeliveredPassengers.length ){
        // Schedule next frame
        $timeout( animate, $scope.selections.animationInterval.intervalMs );
      } else {
        generateReport( $scope.passengers );
        generateTimingStats( timings );
      }
    }

    // Start the animation loop
    console.log( 'Animation interval (ms): ' + $scope.selections.animationInterval.intervalMs );
    animate();  



    // Compute helicopter heading based on desired course, wind, and airspeed
    // Returns an object literal with the following heading components:
    //   x: horizontal component of heading vector
    //   y: vertical component of heading vector
    //   angle: angle of heading vector with respect to positive x-axis
    function computeHeading(course_x, course_y, wind_x, wind_y, airspeed) {
        var
          // angle of desired course
          courseAngle = Math.atan2( course_y, course_x ),
          // angle of wind
          windAngle = Math.atan2( wind_y, wind_x ),
          // wind angle with respect to course
          windAngleOfIncidence = windAngle - courseAngle,
          windMagnitude = Math.sqrt( wind_x * wind_x + wind_y * wind_y ),
          // magnitude of crosswind component (i.e. perdendicular to course)
          crosswindMag = windMagnitude * Math.sin(windAngleOfIncidence),
          // negative of crosswind magnitude, limited by helicopter airspeed 
          crosswindCorrectionMag = clamp( -crosswindMag, -airspeed, airspeed ),
          // compute sine of wind correction angle
          sinCorrectionAngle = crosswindCorrectionMag / airspeed,
          // calculate the helicopter heading with respect to desired course
          correctionAngle = Math.asin( sinCorrectionAngle ),
          // compute heading angle with respect to x-axis
          headingAngle = correctionAngle + courseAngle,
          // compute x- and y-components of heading vector
          heading_x = airspeed * Math.cos( headingAngle ),
          heading_y = airspeed * Math.sin( headingAngle );

        return { x: heading_x, y: heading_y, angle: headingAngle };
      }

      // Constrain value within range of [min, max]
      function clamp(value, min, max){
        if ( value < min ) return min;
        if ( value > max ) return max;
        return value;
      }

    function generateReport( passengers ){
      var minReady = Math.min.apply( null, passengers.map(function(p){ return p.readyAt; }));
      var maxDelivered = Math.max.apply( null, passengers.map(function(p){ return p.deliveredAt; }));
      var durationMs = maxDelivered - minReady;

      console.log('minReady=' + minReady);
      console.log('maxDelivered=' + maxDelivered);
      //var durationMinutes = Math.floor( durationMs / 60000.0 );
      //var durationSeconds = ( durationMs - 60000 * durationMinutes ) / 1000.0;
      //durationMinutes + ':' + (durationSeconds < 10 ? '0' : '') + durationSeconds.toFixed(2);
      $scope.elapsedTime = formatElapsed( durationMs );
    }


    function formatElapsed( millisec ){
      var durationMinutes = Math.floor( millisec / 60000.0 );
      var durationSeconds = ( millisec - 60000 * durationMinutes ) / 1000.0;
      return durationMinutes + ':' + (durationSeconds < 10 ? '0' : '') + durationSeconds.toFixed(1);
    }


    function pad(num, width, padChar) {
      padChar = padChar || '0';
      num = num + '';
      return num.length >= width ? num : new Array(width - num.length + 1).join(padChar) + num;
    }


    function generateTimingStats( arr ){
      var min = 99999999, max = 0, total = 0, avg;
      for ( var i = 0, len = arr.length; i < len; i++ ){
        total += arr[i];
        if ( arr[i] < min ) min = arr[i];
        if ( arr[i] > max ) max = arr[i];
      }
      avg = total / arr.length;
      console.log( 'min=' + min.toFixed(3) );
      console.log( 'max=' + max.toFixed(3) );
      console.log( 'avg=' + avg.toFixed(3) );
    }
});


/* Array of potential passengers.
** Probably should pull these in from a service.
*/
var persons = [
  {
    "name": "Rick James",
    "city": "Phoenix",
    "zip": 85051,
    "lat": 33.5791048,
    "lng": -112.1515555
  },
  {
    "name": "Freddie Mercury",
    "city": "Scottsdale",
    "zip": 85032,
    "lat": 33.617367,
    "lng": -111.879048
  },
  {
    "name": "Eddie Money",
    "city": "Fountain Hills",
    "zip": 85258,
    "lat": 33.5541185,
    "lng": -111.7444259
  },
  {
    "name": "Yngwie Malmsteem",
    "city": "Phoenix",
    "zip": 85053,
    "lat": 33.6346034,
    "lng": -112.1497104
  },
  {
    "name": "John Bonham",
    "city": "Phoenix",
    "zip": 85021,
    "lat": 33.5778487,
    "lng": -112.0917989
  },
  {
    "name": "Steve Perry",
    "city": "Phoenix",
    "zip": 85018,
    "lat": 33.454372,
    "lng": -111.963068
  },
  {
    "name": "David Paich",
    "city": "Phoenix",
    "zip": 85004,
    "lat": 33.6122129,
    "lng": -111.9655176
  },
  {
    "name": "Alex Van Halen",
    "city": "Scottsdale ",
    "zip": 85254,
    "lat": 33.5815568,
    "lng": -111.933732
  },
  {
    "name": "Amy Lee",
    "city": "Cave Creek",
    "zip": 85266,
    "lat": 33.757534,
    "lng": -111.9524
  },
  {
    "name": "Candy Dulfer",
    "city": "Scottsdale",
    "zip": 85018,
    "lat": 33.454467,
    "lng": -111.87536
  },
  {
    "name": "Paul Hardcastle",
    "city": "Phoenix",
    "zip": 85041,
    "lat": 33.3903924,
    "lng": -112.2765659
  },
  {
    "name": "Joe Satriani",
    "city": "Scottsdale",
    "zip": 85260,
    "lat": 33.6081362,
    "lng": -111.9201204
  },
  {
    "name": "Lindsey Stirling",
    "city": "Phoenix",
    "zip": 85017,
    "lat": 33.504739,
    "lng": -112.127767
  },
  {
    "name": "Stewart Copeland",
    "city": "Chandler",
    "zip": 85224,
    "lat": 33.298039,
    "lng": -111.86955
  },
  {
    "name": "MC Hammer",
    "city": "Queen Creek",
    "zip": 85297,
    "lat": 33.1904345,
    "lng": -111.6938745
  },
  {
    "name": "Dizzy Gillespie",
    "city": "Glendale",
    "zip": 85306,
    "lat": 33.6192465,
    "lng": -112.1850876
  },
  {
    "name": "Sting",
    "city": "Chandler",
    "zip": 85018,
    "lat": 33.275516,
    "lng": -111.879572
  },
  {
    "name": "Adam Levine",
    "city": "Mesa",
    "zip": 85041,
    "lat": 33.4284764,
    "lng": -111.7052862
  },
  {
    "name": "Christina Aguilera",
    "city": "Litchfield Park",
    "zip": 85260,
    "lat": 33.456322,
    "lng": -112.4083387
  },
  {
    "name": "Sarah Vaughan",
    "city": "Anthem",
    "zip": 85017,
    "lat": 33.864549,
    "lng": -112.149245
  },
  {
    "name": "Charlie Parker",
    "city": "Avondale",
    "zip": 85224,
    "lat": 33.45398,
    "lng": -112.304333
  },
  {
    "name": "Ian Astbury",
    "city": "Cave Creek",
    "zip": 85297,
    "lat": 33.784636,
    "lng": -111.95681
  },
  {
    "name": "Jonathan Cain",
    "city": "Glendale",
    "zip": 85306,
    "lat": 33.672246,
    "lng": -112.222106
  }
];

var windConditions = [
  {
    "day": "Day 1",
    "vx": -6,   // -6 indicates from the east at 6 mph
    "vy": 22    // 22 indicates from the south at 22 mph
  },
  {
    "day": "Day 2",
    "vx": 28,    // 28 indicates from the west at 28 mph
    "vy": -19    // -10 indicates from the north at 19 mph
  },
  {
    "day": "Day 3",
    "vx": 11,
    "vy": 33
  },
  {
    "day": "Day 4",
    "vx": -60,
    "vy": 2
  },
  {
    "day": "Day 5",
    "vx": 0,
    "vy": 0
  },
  {
    "day": "Strong Easterly",
    "vx": -150,
    "vy": 0
  },
  {
    "day": "Strong Southerly",
    "vx": 0,
    "vy": 180
  }
];


