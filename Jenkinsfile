pipeline {
    agent any

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }
        stage('Prepare .env file') {
            steps {
                withCredentials([string(credentialsId: 'my_env_file', variable: 'ENV_CONTENTS')]) {
                    writeFile file: '.env', text: "${ENV_CONTENTS}"
                }
            }
        }
        stage('Deploy') {
            steps {
                sh 'pm2 stop your_app_name || true'
                sh 'pm2 start app.js --name your_app_name'
            }
        }
    }
}
