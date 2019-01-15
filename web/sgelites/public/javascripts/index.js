$(document).ready(function(){
  $.get('/api/stats/online', function(onlineData){
    onlineData = JSON.parse(onlineData);

    $('#onlineHistory').removeClass('spinner');

    var online_data = onlineData.map(function(date){ return date.no_online; });
    var online_dates = onlineData.map(function(date){ return date.datetime });
    var labels = onlineData.map(function(date){ return moment(date.datetime).format('ha'); });

    var onlineHistoryCanvas = document.getElementById('onlineHistory').getContext('2d');
    var onlineHistoryChart = new Chart(onlineHistoryCanvas,{
        type: 'line',
        data: {
          datasets: [{
              data: online_data,
              backgroundColor: 'rgba(255,255,255,0)',
              borderColor: 'rgba(255,255,255,0.7)',
              lineTension: 0,
              borderWidth: 1,
              pointBorderWidth: 2,
              pointStyle: 'circle'
          }],
          labels: labels
        },
        options: {
          maintainAspectRatio: false,
          title: {
            display: false,
            text: 'Clan Activity',
            padding: 30,
            fontColor: 'white'
          },
          legend: {
            display: false
          },
          scales: {
            xAxes: [{
              gridLines: {
                display: false,
                color: 'rgba(255,255,255,0.1)',
              },
              ticks: {
                fontColor: 'rgba(255,255,255,0.5)'
              },
              scaleLabel: {
                display: false,
                labelString: 'Time',
                fontColor: 'rgba(255,255,255,0.5)'
              }
            }],
            yAxes: [{
              gridLines: {
                display: false,
                color: 'rgba(255,255,255,0.1)'
              },
              ticks: {
                fontColor: 'rgba(255,255,255,0.5)'
              },
              scaleLabel: {
                display: false,
                labelString: 'Members Online',
                fontColor: 'rgba(255,255,255,0.5)'
              }
            }]
          },
          tooltips: {
            displayColors: false,
            callbacks: {
              title: function(tooltipItem, data) {
                return online_data[tooltipItem[0]['index']] + ' Members';
              },
              label: function(tooltipItem, data) {
                return moment( online_dates[tooltipItem['index']] ).format('D MMM YYYY, ddd h A')
              }
            }
          }
        },
    });
  });
});