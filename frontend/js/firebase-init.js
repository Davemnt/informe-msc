// Firebase initialization (compat mode for simple script usage)
(function(){
  // Firebase config provided by the user
  const firebaseConfig = {
    apiKey: "AIzaSyAh7AyKKhILfQYkmsoraIw3Lw4h4VjC_Us",
    authDomain: "informe-msc.firebaseapp.com",
    projectId: "informe-msc",
    storageBucket: "informe-msc.firebasestorage.app",
    messagingSenderId: "717200870480",
    appId: "1:717200870480:web:8478d5c5a469fcccc11555"
  };

  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded. Make sure to include the CDN scripts before this file.');
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Default admin email used for PIN sign-in (can be changed here)
  const adminEmail = 'admin@informe-msc.local';

  window.firebaseApp = {
    auth,
    db,
    adminEmail,

    async sendInforme(data) {
      // Ensure arrays are stored as arrays and booleans/numbers are normalized
      const payload = Object.assign({}, data);
      payload.organizaciones = payload.organizaciones || [];
      payload.unidades = payload.unidades || [];
      payload.futuros_elderes = payload.futuros_elderes || [];
      payload.fecha_informe = firebase.firestore.FieldValue.serverTimestamp();

      try {
        console.debug('firebaseApp.sendInforme: payload=', payload);
        const ref = await db.collection('informes').add(payload);
        console.info('firebaseApp.sendInforme: escrito documento id=', ref.id);
        return { id: ref.id };
      } catch (err) {
        console.error('firebaseApp.sendInforme error:', err);
        throw err;
      }
    },

    async deleteInforme(id) {
      // Elimina un informe por ID en Firestore
      try {
        await db.collection('informes').doc(id).delete();
        console.info('firebaseApp.deleteInforme: eliminado documento id=', id);
        return true;
      } catch (err) {
        console.error('firebaseApp.deleteInforme error:', err);
        throw err;
      }
    },

    async signIn(email, password) {
      const userCred = await auth.signInWithEmailAndPassword(email, password);
      return userCred.user;
    },

    async signOut() {
      await auth.signOut();
    },

    async fetchAllInformes() {
      const snapshot = await db.collection('informes').orderBy('fecha_informe', 'desc').get();
      return snapshot.docs.map(doc => {
        const d = doc.data();
        // Convert Firestore Timestamp to ISO string for compatibility
        let fecha = '';
        if (d.fecha_informe && d.fecha_informe.toDate) {
          fecha = d.fecha_informe.toDate().toISOString();
        } else if (d.fecha_informe) {
          fecha = new Date(d.fecha_informe).toISOString();
        }

        return Object.assign({ id: doc.id, fecha_informe: fecha }, d);
      });
    },

    onAuthStateChanged(cb) {
      return auth.onAuthStateChanged(cb);
    }
  };

})();
