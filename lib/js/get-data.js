//adapted from the cerner smart on fhir guide. updated to utalize client.js v2 library and FHIR R4

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// display the patient name gender and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

//function to display list of medications
function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

//helper function to get quantity and unit from an observation resource.
function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

function getQuantityValue(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2));
  } else {
    return undefined;
  }
}

// helper function to get both systolic and diastolic bp
function getBloodPressureValues(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return formattedBPObservations;
}

// create a patient object to initialize the patient
function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    note: 'No Annotation',
  };
}

//helper function to display the annotation on the index page
function displayAnnotation(annotation) {
  note.innerHTML = `${annotation.time},${annotation.authorString},${annotation.text}`;
}

//function to display the observation values you will need to update this
function displayObservation(pat) {
  hdl.innerHTML = pat.hdl;
  ldl.innerHTML = pat.ldl;
  sys.innerHTML = pat.sys;
  dia.innerHTML = pat.dia;
  height.innerHTML = pat.height;
  weight.innerHTML = pat.weight;
}

function displayChart(container, yAxis, name, series, plotBands = []){
  Highcharts.chart(container, {
    chart: {
      type: 'spline'
    },

    credits: {
      enabled: false
    },

    tooltip: {
      shared: true
    },

    title: {
        text: `Patient ${name}`
    },

    yAxis: {
        title: {
            text: yAxis
        },
      plotBands
    },

    xAxis: {
      type: 'datetime',
      labels: {
        overflow: 'justify'
      },
      // dateTimeLabelFormats: { // don't display the dummy year
      //     month: '%e. %b',
      //     year: '%b'
      // },
      title: {
          text: 'Date'
      }
  },

    legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
    },

    plotOptions: {
      series: {
          marker: {
              enabled: true
          }
      }
  },

    series,

    responsive: {
        rules: [{
            condition: {
                maxWidth: 500
            },
            chartOptions: {
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom'
                }
            }
        }]
    }

});

}

//once fhir client is authorized then the following functions can be executed
// const client = await FHIR.oauth2.ready();
const client = new FHIR.client({
  serverUrl: "https://r4.smarthealthit.org",
  tokenResponse: {
    patient: "a6889c6d-6915-4fac-9d2f-fc6c42b3a82e"
  }
});

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );


  // get observation resource values
  // you will need to update the below to retrieve the weight and height values
  var query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", 100);
  query.set("_sort", "-date");
  query.set("code", [
    'http://loinc.org|8462-4',
    'http://loinc.org|8480-6',
    'http://loinc.org|2085-9',
    'http://loinc.org|2089-1',
    'http://loinc.org|55284-4',
    'http://loinc.org|3141-9',
    'http://loinc.org|29463-7',
    'http://loinc.org|8302-2',
    'http://loinc.org|39156-5',
  ].join(","));

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {
  
      // group all of the observation resources by type into their own
      var byCodes = client.byCodes(ob, 'code');
      var systolicbps = getBloodPressureValues(byCodes('55284-4'), '8480-6');
      var diastolicbps = getBloodPressureValues(byCodes('55284-4'), '8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');
      var weights = byCodes('29463-7');
      var heights = byCodes('8302-2');
      var bmi = byCodes('39156-5');
  
      // create patient object
      var p = defaultPatient();
  
      var systolicbp = getQuantityValueAndUnit(systolicbps[0]),
      diastolicbp = getQuantityValueAndUnit(diastolicbps[0])

      // set patient value parameters to the data pulled from the observation resource
      if (typeof systolicbp != 'undefined') {
        p.sys = systolicbp;
      } else {
        p.sys = 'undefined'
      }
  
      if (typeof diastolicbp != 'undefined') {
        p.dia = diastolicbp;
      } else {
        p.dia = 'undefined'
      }
  
      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);
      p.weight = getQuantityValueAndUnit(weights[0]);
      p.height = getQuantityValueAndUnit(heights[0]);
  
      // set latest annotation if one already exists
      if (p.weight?.note?.[0]) displayAnnotation(p.weight.note[0]);

      displayObservation(p);

      var dateFromEffective = effective =>{
        effectiveDate = new Date(effective);
        return Highcharts.time.Date.UTC(effectiveDate.getFullYear(),effectiveDate.getMonth(), effectiveDate.getDate())
      };

      var dedupAndPair = items => Object.values(
        items
        // map vitals to time value pairs
        .map(item => [dateFromEffective(item.effectiveDateTime), getQuantityValue(item)])
        // remove items on the same day, taking the more recent one (sorted descending)
        .reduce((prev, curr)=> {
          if (!prev[curr[0].toString()])
            prev[curr[0].toString()] = curr;
          return prev;
        }, {})
      )
      .sort((l,r)=>l[0]-r[0]);

      heights = {name: "height", data: dedupAndPair(heights)};
      weights = {name: "weight", data: dedupAndPair(weights)};
      hdl = {name: "hdl", data: dedupAndPair(hdl)};
      ldl = {name: "ldl", data: dedupAndPair(ldl)};
      systolicbps = {name: "systolic", data: dedupAndPair(systolicbps)};
      diastolicbps = {name: "diastolic", data: dedupAndPair(diastolicbps)};
      bmi = {name: "bmi", data: dedupAndPair(bmi)};

      var low = "rgba(68, 170, 213, 0.1)",
      normal = "rgba(0, 170, 0, 0.1)",
      elevated = "rgba(250, 212, 42, 0.1)",
      high = "rgba(250, 42, 42, 0.1)";

      bpBands = [
        {
          from: 120,
          to: 100,
          color: normal,
          label: {
              text: 'Normal Systolic',
              style: {
                  color: '#606060'
              }
          }
      },
      { // Gentle breeze
        from: 120,
        to: 129,
        color: elevated,
        label: {
            text: 'Pre-hypertension Systolic',
            style: {
                color: '#606060'
            }
        }
    },
    { // Gentle breeze
      from: 130,
      to: 220,
      color: high,
      label: {
          text: 'Hypertension Systolic',
          style: {
              color: '#606060'
          }
      }
    },
      { // Gentle breeze
        from: 80,
        to: 100,
        color: high,
        label: {
            text: 'Hypertension Diastolic',
            style: {
                color: '#606060'
            }
      }
    },
    { // Gentle breeze
      from: 0,
      to: 80,
      color: normal,
      label: {
          text: 'Normal Diastolic',
          style: {
              color: '#606060'
          }
    }
  }
      ];

      //calculate bmi over time
      // chart with plot bands for over/under weight and obese etc.
      bmiBands = [
        {
          from: 0,
          to: 18.5,
          color: low,
          label: {
              text: 'Underweight',
              style: {
                  color: '#606060'
              }
          }
      },
      {
        from: 18.5,
        to: 24.9,
        color: normal,
        label: {
            text: 'Healthy Weight',
            style: {
                color: '#606060'
            }
        }
    },
    {
      from: 25,
      to: 29.9,
      color: elevated,
      label: {
          text: 'Overweight',
          style: {
              color: '#606060'
          }
      }
  },
  {
    from: 30,
    to: 80,
    color: high,
    label: {
        text: 'Obese',
        style: {
            color: '#606060'
        }
    }
}
];

      // chart available vitals
      //? only chart for a set period, like past month? would keep the scale consistent between charts
      displayChart("height-container", "height (cm)", "height", [heights]);
      displayChart("weight-container", "weight (kg)", "weight", [weights]);
      displayChart("hldl-container", "mg/dL", "hdl and ldl", [hdl, ldl]);
      displayChart("bp-container", "Blood Pressure (mmHg)", "Blood Pressure", [systolicbps, diastolicbps], bpBands);
      displayChart("bmi-container", "BMI (kg/m^2)", "Body Mass Index", [bmi], bmiBands);
    });
  

  
// example from client docs switched to v4
const getPath = client.getPath;

function getMedicationName(medCodings = []) {
    return medCodings[0]?.display || "Unnamed Medication(TM)";
}

client.request(`/MedicationRequest?patient=${client.patient.id}`, {
    resolveReferences: "medicationReference"
}).then(data => data.entry.map(item => getMedicationName(
    getPath(item, "resource.medicationCodeableConcept.coding") ||
    getPath(item, "resource.medicationReference.code.coding")
))).then(meds => {
  meds.forEach(function(med) {
  displayMedication(med);
})}, error => {
  displayMedication(String(error));
});

  //update function to take in text input from the app and add the note for the latest weight observation annotation
  //you should include text and the author can be set to anything of your choice. keep in mind that this data will
  // be posted to a public sandbox
  function addWeightAnnotation() {
    var date = new Date(),
    offset = date.getTimezoneOffset(), // in minutes
    offsetSign = offset < 0?'-':'+';
  
    // abs to allow for consistent padding
    offset = Math.abs(offset);
  
    var offsetHour = String(offset/60).padStart(2,'0'),
    offsetMinute = String(offset%60).padStart(2,'0'),
    offsetString=`${offsetSign}${offsetHour}:${offsetMinute}`,
    time = `${date.toISOString().split('.')[0]}${offsetString}`,
    text = document.getElementById("annotation").value,
    authorString = "cphrampus3";

    var annotation = {authorString, time, text};
  
    displayAnnotation(annotation);
  
    // add note obj to saved weight obv
    weightObv.note = [annotation, ...(weightObv.note||[])];
  
    // post back updated object
    client.update(weightObv);
  }

  //event listener when the add button is clicked to call the function that will add the note to the weight observation
  document.getElementById('add').addEventListener('click', addWeightAnnotation);

