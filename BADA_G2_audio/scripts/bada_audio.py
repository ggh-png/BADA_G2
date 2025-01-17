#!/usr/bin/env python
import sys
print('python version: ',sys.version_info)

import pyaudio
import numpy as np
from matplotlib import pyplot as plt

import soundfile as sf

import params
import yamnet as yamnet_model

import datetime
import time
import queue

import roslibpy
import rospy
import json

import os

from std_msgs.msg import String
from std_msgs.msg import Empty
from audio_common_msgs.msg import AudioData
import tensorflow as tf

abspath = os.path.abspath(__file__)
dname = os.path.dirname(abspath)
os.chdir(dname)

pub=''
# keys=['Speech','Alarm','Door','Television', 'Silence', 'Water', 'Music']
# target: door, water, fire alarm, bell, cry, boiling
keys=['Alarm','Door','Bell', 'Silence', 'Cry', 'Water', 'Boiling']
alarmKeys=['Alarm', 'Fire alarm', 'Alarm clock']
doorKeys=['Door', 'Knock']
bellKeys=['Beep, bleep', 'Doorbell'] # Bell, 'Ding-dong'
cryKeys=['Crying, sobbing', 'Baby cry, infant cry']
boilKeys=['Boiling', 'Liquid', 'Water',] # 'Water', 'Pour', 'Drip'
waterKeys=['Water tap, faucet', 'Sink (filling or washing)']
signals=dict.fromkeys(keys, 0.0)
picked=dict.fromkeys(keys, 0.0)
detected=dict.fromkeys(keys, False)
detectThreshold=0.40
checkThreshold=0.25
resetThreshold=0.1


# Set up the YAMNet model.
params.PATCH_HOP_SECONDS = 0.48  # 10 Hz scores frame rate. //0.1
yamnet = yamnet_model.yamnet_frames_model(params)
yamnet.load_weights('yamnet.h5')
class_names = yamnet_model.class_names('yamnet_class_map.csv')

CHUNKSIZE = 16000 # fixed chunk size
sr=16000
seconds=1
predictionPeriod=2.0
predictionRate=2.0
predChunkSize=int(sr*predictionPeriod)
readChunkSize=int(sr*predictionRate)

duration=50

frames=[]
last5secFrames=[]
old5secFrames=[]

frameQ=queue.Queue()
qsize=0
pub = rospy.Publisher('/signal', String, queue_size=10)
detectInfoPub = rospy.Publisher('/bada/audio/info', String, queue_size=10)
checkPub = rospy.Publisher('/bada/audio/checker', Empty, queue_size=10)
audioPub = rospy.Publisher('/audio', String, queue_size=10)

# yamnet._make_predict_function()

#somewhere accessible to both:
callback_queue = queue.Queue()

def from_dummy_thread(func_to_call_from_main_thread):
    callback_queue.put(func_to_call_from_main_thread)

def from_main_thread_blocking():
    callback = callback_queue.get() #blocks until an item is available
    callback()

def from_main_thread_nonblocking():
    while True:
        try:
            callback = callback_queue.get(False) #doesn't block
        except queue.Empty: #raised when queue is empty
            break
        callback()

def signal(msg):
    global frames, qsize, yamnet, graph, callback_queue
    # read new data and update last 5 sec frames
    old=time.time()
    for i, v in enumerate(msg.data):
        qsize+=1
        frameQ.put(v)

    # frames+=[msg.data]
    # if(len(frames)<=int(predictionPeriod/predictionRate)):
    #     return
    if(qsize<=int(sr*predictionPeriod/predictionRate*2)):
        return
    current=[]
    for i in range(sr*2):
        qsize-=1
        current.append(frameQ.get())
        if(frameQ.empty()): break
    # print(current)
    waveform = np.frombuffer(bytearray(current), dtype=np.int16) / 32768.0
    # print(type(waveform))
    # print(waveform.shape)

    old=time.time()
    scores, spectrogram = yamnet.predict(np.reshape(waveform, [1, -1]), steps=1)
    # outputs = model.predict(inputs)
    # scores, spectrogram = yamnet.predict(np.reshape(waveform, [1, -1]), steps=1)
    # print('prediction time: ', time.time()-old)
    old=time.time()

    # Plot and label the model output scores for the top-scoring classes.
    mean_scores = np.mean(scores, axis=0)
    top_N = 10
    top_class_indices = np.argsort(mean_scores)[::-1][:top_N]

    dat=np.dstack((class_names[top_class_indices],mean_scores[top_class_indices])).tolist()
    try:
        audioPub.publish(roslibpy.Message({'data': json.dumps(dat)}))
    except:
        pass
    # hello_str = "hello world %s" % rospy.get_time()
    picked=dict.fromkeys(keys, 0.0)
    for _,v in enumerate(dat[0]):
        [key, prob]=v
        # SWITHC

        if(key in alarmKeys):
            picked['Alarm']+=float(prob)*5.0
        elif(key in doorKeys):
            picked['Door']+=float(prob)*10.0
        elif(key in bellKeys):
            picked['Bell']+=float(prob)*5.0
        elif(key in cryKeys):
            picked['Cry']+=float(prob)
        elif(key in boilKeys):
            picked['Boiling']+=float(prob)*6.0
        elif(key in waterKeys):
            picked['Water']+=float(prob)
        else:
            # rospy.loginfo(key in keys)
            picked[key]=float(prob)

        #if(key not in cryKeys):
        #    picked[key]=0
    picked['Alarm']/=len(alarmKeys)*3.0
    picked['Door']/=len(doorKeys)*5.0
    picked['Bell']/=len(bellKeys)*4.0
    picked['Cry']/=len(cryKeys)*5
    picked['Boiling']/=len(boilKeys)*5.0
    picked['Water']/=len(waterKeys)*5.0

    

    # update 
    for _, v in enumerate(keys):
        if(signals[v]<0.00001):
            signals[v]=0

        if(v == 'Alarm'):
            #picked['Alarm']+=float(prob)
            signals[v]=signals[v]*0.2+picked[v]*0.8
        elif(v == 'Door'):
            signals[v]=signals[v]*0.05+picked[v]*0.95
        elif(v == 'Bell'):
            signals[v]=signals[v]*0.05+picked[v]*0.95
        elif(v == 'Cry'):
            signals[v]=signals[v]*0.4+picked[v]*0.8
        elif(v == 'Boiling'):
            signals[v]=signals[v]*0.45+picked[v]*0.55
        elif(v == 'Water'):
            signals[v]=signals[v]*0.45+picked[v]*0.55

        # rospy.loginfo(signals[v])
        # signals[v]=signals[v]*0.3+picked[v]*0.7
        print(v+' ' +str(round(signals[v], 2)) + ' ' + str(detected[v]))

    # detect
    detectAny=False
    for _, v in enumerate(keys):
        detectInfoPub.publish('key ' + v + str(signals[v]))
        if(signals[v]> checkThreshold):
            if(v != 'Silence'):
                detectAny=True
            if(detected[v]==False):
                detected[v]=True
                rospy.loginfo('publish:'+v)
                pub.publish(v)
        if(detected[v]==True and signals[v]<resetThreshold):
            detected[v]=False
    if(detectAny):
        print('check : ' + str(datetime.datetime.now()))
        checkPub.publish()
    
    print('prediction: ', dat)

def callback(msg):
    global frames, qsize, yamnet, graph, callback_queue

    from_dummy_thread(lambda: signal(msg))

def respeaker_node():
    # global pub, keys, signals, picked, frames
    rospy.init_node('respeaker_node', anonymous=True)
    rospy.loginfo('starting')

    rospy.Subscriber("/audio/channel0", AudioData, callback)

    while(not rospy.is_shutdown()):
        # from_main_thread_blocking()
        from_main_thread_nonblocking()
        # print('spinning')
        # rospy.spin()
        time.sleep(0.1)

if __name__ == '__main__':
    respeaker_node()

    # except rospy.ROSInterruptException:
    #     pass