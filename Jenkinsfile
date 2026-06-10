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


pipeline {
    agent any

    environment {
        GROQ_API_KEY  = credentials("GROQ_API_KEY")
    }

    stages{
        stage('Checkout'){
            steps{
                checkout scm
            }
        }

        stage('Install Dependencies'){
         steps{
            bat 'npm install'
         }
        }
        stage('Run Basic Check'){
             steps{
                bat 'npm test'
            }
        }

        stage('AI Code Review'){
            steps{
                bat 'node reviewCode.js'
            }
        }
           
    }

post {
    always{
        echo 'pipeline completed.'
    }
    success{
        echo 'PR is ready for review.'
    }
    failure{
        echo 'Pipeline failed. Check AI review or test output'
    }
}

}
