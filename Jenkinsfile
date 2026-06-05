// pipeline {
//     agent any

//     stages {

//         stage('Install Dependencies') {
//             steps {
//                 bat 'npm install'
//             }
//         }

//         stage('Run Application') {
//             steps {
//                bat 'start /B node server.js'
//             }
//         }
//     }
// }


pipeline {
    agent any

    stages {

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Deploy') {
            steps {
                bat '"C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" delete node-app'
                bat '"C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" start server.js --name node-app'
                bat '"C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" save'
            }
        }
    }
}