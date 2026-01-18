import firebase_admin
from firebase_admin import credentials, db
import json

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dentiste-site-default-rtdb.firebaseio.com/'
})

# Load appointments from JSON
with open("appointments.json", "r", encoding="utf-8") as f:
    appointments = json.load(f)

# Push each appointment to Firebase
ref = db.reference("appointments")  # main reference in Firebase

for appt in appointments:
    ref.push(appt)  # creates a new key for each appointment

print(f"{len(appointments)} appointments imported successfully!")
