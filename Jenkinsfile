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




// pipeline {
//     agent any

//     stages {

//         stage('Install Dependencies') {
//             steps {
//                 bat 'npm install'
//             }
//         }

//         stage('Deploy') {
//             steps {
//                 bat '''
//                 set PM2_HOME=C:\\pm2

//                 if not exist C:\\pm2 mkdir C:\\pm2
//                 if not exist C:\\pm2\\logs mkdir C:\\pm2\\logs
//                 if not exist C:\\pm2\\pids mkdir C:\\pm2\\pids

//                 "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" restart node-app --update-env || "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" start server.js --name node-app
//                 '''
//             }
//         }
//     }
// }





// pipeline {
//     agent any

//     stages {

//         stage('Install Dependencies') {
//             steps {
//                 bat 'npm install'
//             }
//         }

//         stage('Deploy') {
//             steps {
//                 bat '''
//                 rem Start the app without PM2
//                 rem This uses the start script from package.json
//                 start /B npm start
//                 '''
//             }
//         }
//     }
// }


// pipeline {
//     agent any

//     stages {
//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Install Dependencies') {
//             steps {
//                 bat 'npm ci'
//             }
//         }

//         stage('Run Basic Check') {
//             steps {
//                 bat 'npm test'
//             }
//         }

//         stage('AI Code Review') {
//             steps {
//                 script {
//                     try {
//                         withCredentials([string(credentialsId: 'GROQ_API_KEY', variable: 'GROQ_API_KEY')]) {
//                             bat 'node reviewCode.js'
//                         }
//                     } catch (err) {
//                         if (err.getMessage()?.contains('GROQ_API_KEY')) {
//                             echo 'GROQ_API_KEY credential is not configured in Jenkins. Retrying review with local .env support.'
//                             bat 'node reviewCode.js'
//                         } else {
//                             throw err
//                         }
//                     }
//                 }
//             }
//         }
//     }

//     post {
//         always {
//             echo 'pipeline completed.'
//         }
//         success {
//             echo 'PR is ready for review.'
//         }
//         failure {
//             echo 'Pipeline failed. Check AI review or test output.'
//         }
//     }
// }



pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Run Basic Check') {
            steps {
                bat 'npm test'
            }
        }

        stage('AI Code Review') {
            steps {
                script {
                    try {
                        withCredentials([string(credentialsId: 'GROQ_API_KEY', variable: 'GROQ_API_KEY')]) {
                            bat 'node reviewCode.js'
                        }
                    } catch (err) {
                        if (err.getMessage()?.contains('GROQ_API_KEY')) {
                            echo 'GROQ_API_KEY credential is not configured in Jenkins. Retrying review with local .env support.'
                            bat 'node reviewCode.js'
                        } else {
                            throw err
                        }
                    }
                }
            }
        }

       stage('Deploy') {
    steps {
         bat '''
                set "PM2_HOME=C:\\pm2"

                if not exist C:\\pm2 mkdir C:\\pm2
                if not exist C:\\pm2\\logs mkdir C:\\pm2\\logs
                if not exist C:\\pm2\\pids mkdir C:\\pm2\\pids

                call "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" describe node-app >nul 2>&1
                if errorlevel 1 (
                    call "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" start server.js --name node-app --update-env
                ) else (
                    call "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" restart node-app --update-env
                )

                call "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" save
                call "C:\\Users\\HP\\AppData\\Roaming\\npm\\pm2.cmd" list
                '''
    }
}
    }

    post {
        always {
            echo 'pipeline completed.'
        }
        success {
            echo 'PR is ready for review.'
        }
        failure {
            echo 'Pipeline failed. Check AI review or test output.'
        }
    }
}
