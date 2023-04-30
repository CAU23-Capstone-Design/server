pipeline {
    agent {
        label 'ubuntu_agent'
    }
    environment {
        NODEJS_HOME = "${tool 'node'}"
        PATH = "${env.NODEJS_HOME}/bin:${env.PATH}"
    }
    stages {
        stage('Set up nvm and select node/npm version') {
            steps {
                sh '''
                    . $NODEJS_HOME/lib/node_modules/nvm/nvm.sh
                    nvm install 18.14.2
                    nvm use 18.14.2
                    nvm install-latest-npm
                '''
            }
        }
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
                sh 'pm2 stop lovestory || true'
                sh 'pm2 start app.js --name lovestory'
            }
        }
    }
}
