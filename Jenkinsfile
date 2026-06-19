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
                expression { return env.CHANGE_ID }
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
                            bat 'node src/reviewCode.js'
                        }
                    } catch (err) {
                        def message = err.getMessage() ?: ''
                        if (message.toLowerCase().contains('credential')) {
                            echo 'GROQ_API_KEY credential was not available. Falling back to local env support.'
                            bat 'node src/reviewCode.js'
                        } else {
                            throw err
                        }
                    }
                }
            }
        }

        stage('Post PR Comment') {
            when {
                expression { return env.CHANGE_ID }
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
                            bat 'node src/githubComment.js'
                        }
                    } catch (err) {
                        def message = err.getMessage() ?: ''
                        if (message.toLowerCase().contains('credential')) {
                            echo 'GITHUB_TOKEN credential was not available. Falling back to local env support.'
                            bat 'node src/githubComment.js'
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
