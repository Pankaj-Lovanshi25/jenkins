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

    environment {
        GITHUB_OWNER = 'Pankaj-Lovanshi25'
        GITHUB_REPO  = 'jenkins'
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '10'))
    }

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
            when {
                expression { return env.BRANCH_NAME && env.BRANCH_NAME != 'main' }
            }
            steps {
                script {
                    try {
                        withCredentials([
                            string(
                                credentialsId: 'GROQ_API_KEY',
                                variable: 'GROQ_API_KEY'
                            )
                        ]) {
                            bat 'node reviewCode.js'
                        }
                    } catch (err) {
                        def message = err.getMessage() ?: ''
                        if (message.toLowerCase().contains('credential')) {
                            echo 'GROQ_API_KEY credential was not available. Falling back to local env support.'
                            bat 'node reviewCode.js'
                        } else {
                            throw err
                        }
                    }
                }
            }
        }

        stage('Post PR Comment') {
            when {
                expression { return env.BRANCH_NAME && env.BRANCH_NAME != 'main' }
            }
            steps {
                script {
                    try {
                        withCredentials([
                            string(
                                credentialsId: 'GITHUB_TOKEN',
                                variable: 'GITHUB_TOKEN'
                            )
                        ]) {
                            bat 'node githubComment.js'
                        }
                    } catch (err) {
                        def message = err.getMessage() ?: ''
                        if (message.toLowerCase().contains('credential')) {
                            echo 'GITHUB_TOKEN credential was not available. Falling back to local env support.'
                            bat 'node githubComment.js'
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
                REM PM2 Commands
                '''
            }
        }
    }

    post {
        always {
            echo 'pipeline completed.'
        }
        success {
            echo 'AI review completed for this branch.'
        }
        failure {
            echo 'Pipeline failed.'
        }
    }
}
