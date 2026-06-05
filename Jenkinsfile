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
                bat '''
                set PM2_HOME=C:\\pm2

                if not exist C:\\pm2 mkdir C:\\pm2
                if not exist C:\\pm2\\logs mkdir C:\\pm2\\logs
                if not exist C:\\pm2\\pids mkdir C:\\pm2\\pids

                "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" delete node-app
                "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" start server.js --name node-app
                '''
            }
        }
    }
}