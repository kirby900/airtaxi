
var app = angular
    .module('app',[])
    .controller('CanvasController',function($scope,$timeout){
      var kanvas = document.getElementById('canvas');
      var ctx = kanvas.getContext('2d');

      ctx.fillStyle = "rgb(200,0,0)";  
      ctx.strokeStyle = "rgb(200,0,0)";  
      ctx.fillRect(10, 10, 55, 50);

      //Sets all pixels in the rectangle defined by starting point (x, y) and 
      // size (width, height) to transparent black, erasing any previously drawn content.
      ctx.clearRect(10, 10, 40, 30);

      //Draws a filled rectangle at (x, y) position whose size is determined by width and height.
      ctx.fillRect(20, 20, 30, 10);

      ctx.strokeRect(30, 30, 30, 30);
      
    });
