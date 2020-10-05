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

// helper function to get both systolic and diastolic bp
function getBloodPressureValue(BPObservations, typeOfPressure) {
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

  return getQuantityValueAndUnit(formattedBPObservations[0]);
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
function displayObservation(obs) {
  hdl.innerHTML = obs.hdl;
  ldl.innerHTML = obs.ldl;
  sys.innerHTML = obs.sys;
  dia.innerHTML = obs.dia;
  height.innerHTML = obs.height;
  weight.innerHTML = obs.weight;
}

//once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  // get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      console.log(patient);
    }
  );

  let weightObv = null;


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
  ].join(","));

  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(ob) {
  
      // group all of the observation resources by type into their own
      var byCodes = client.byCodes(ob, 'code');
      var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');
      weightObv = byCodes('29463-7')[0];
      var height = byCodes('8302-2');
  
      // create patient object
      var p = defaultPatient();
  
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
      p.weight = getQuantityValueAndUnit(weightObv);
      p.height = getQuantityValueAndUnit(height[0]);
  
    // set latest annotation if one already exists
    if (weightObv?.note?.[0]) displayAnnotation(weightObv.note[0]);

      displayObservation(p)
  
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


}).catch(console.error);
