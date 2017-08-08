
add: 
	git add *

sync:
	 git commit -m 'change is good'
	 git push heroku master
	 
all: add sync