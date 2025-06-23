import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Image, ScrollView, Text, View } from 'react-native';

import {
  ControlledDateTimeInput,
  ControlledFilePicker,
  ControlledInput,
  ControlledMapPicker,
  ControlledSwitch,
} from './controls';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button, Errorbar } from '@/components';
import { DefaultLocation } from '@/config/constants';
import { auth } from '@/config/firebase';
import { Sighting } from '@/models';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { LatLngSchema } from '@/types';
import { uploadFromURI } from '@/utils';

const reportSchema = z.object({
  name: z.string(),
  location: LatLngSchema.default(DefaultLocation),
  notes: z.string(),
  file: z.string(),
  timestamp: z.date().default(new Date()),
  fed: z.boolean().default(false),
  health: z.boolean().default(false),
  timeofDay: z.string(),
});

type ReportDataType = z.infer<typeof reportSchema>;

const sightingFormConverter = async (
  data: ReportDataType,
): Promise<Sighting> => {
  // Upload all files to storage and get their refs
  const sightingStoragePath = '/';
  const uploadPromise = uploadFromURI(sightingStoragePath, data.file);
  // TODO: Instead of fullPath, switch to using name (uuid) so that we can
  // survive renaming the folder
  const storageUrls = (await uploadPromise).ref.fullPath;
  // TODO: It's possible for an image to be created but the database write
  // fails; find a way to either make the entire operation atomic, or
  // implement garbage collection on the storage bucket.

  // Transform the data to match Sighting schema
  const sightingData: Sighting = {
    id: '-1',
    uid: auth.currentUser?.uid || '',
    name: data.name,
    spotted_time: data.timestamp,
    image: storageUrls,
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    info: data.notes,
    fed: data.fed,
    health: data.health,
    timeofDay: data.timeofDay,
  };

  return Sighting.parse(sightingData);
};

const sightingConverter = (data: Sighting): ReportDataType => {
  return {
    name: data.name || '',
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
    notes: data.info || '',
    file: data.image,
    timestamp: data.spotted_time || new Date(),
    fed: data.fed,
    health: data.health,
    timeofDay: data.timeofDay,
  };
};

type ReportFormProps = {
  type: 'create' | 'edit';
  onSubmit: (data: Sighting) => Promise<void>;
  onDelete?: () => Promise<void>;
  imageURL?: string;
  defaultValues?: Sighting;
};

export const SightingReportForm: React.FC<ReportFormProps> = ({
  type,
  onSubmit,
  onDelete,
  imageURL,
  defaultValues,
}) => {
  const [error, setError] = useState<string>('');

  const { handleSubmit, control } = useForm<ReportDataType>({
    resolver: zodResolver(reportSchema),
    defaultValues: !!defaultValues ? sightingConverter(defaultValues) : {},
  });

  const submitHandler = async (data: ReportDataType) => {
    try {
      const parsedData = await sightingFormConverter(data);
      await onSubmit(parsedData);
    } catch (err: unknown) {
      console.error('Error during upload:', err);
      setError(`Upload failed: ${(err as Error).message}`);
    }
  };

  const onInvalid = (errors: any) => {
    console.log('Form submission errors:', errors);
    setError('There are errors in your form. Please check and try again.');
  };

  return (
    <>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.card}>
          <Text style={textStyles.catalogTitle}>
            {type === 'create' ? 'Report A Sighting' : null}
            {type === 'edit' ? 'Edit A Sighting' : null}
          </Text>
          {/* TODO: Abstract into a component. Make sure to handle firebase errors where image URL does not exist */}
          {type === 'edit' ? (
            imageURL ? (
              <Image
                source={{ uri: imageURL }}
                style={containerStyles.imageMain}
                resizeMode="contain"
              />
            ) : (
              <Text style={textStyles.title}>Loading image...</Text>
            )
          ) : null}
          <View style={containerStyles.inputContainer}>
            <ControlledMapPicker control={control} name="location" />
            <ControlledDateTimeInput control={control} name="timestamp" />
            <ControlledInput
              control={control}
              name="timeofDay"
              placeholder="Time of sighting (morning, afternoon, night)"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledInput
              control={control}
              name="name"
              placeholder="Cat's name"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledInput
              control={control}
              name="notes"
              placeholder="Additional Notes"
              placeholderTextColor="#888"
              style={textStyles.input}
            />
            <ControlledFilePicker control={control} name="file" />
            <ControlledSwitch
              control={control}
              name="fed"
              label="Has been fed"
            />
            <ControlledSwitch
              control={control}
              name="health"
              label="Is in good health"
            />
          </View>
        </View>
        {onDelete ? <Button onPress={onDelete}>Delete</Button> : null}
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={handleSubmit(submitHandler, onInvalid)}
      >
        <Text style={textStyles.bigButtonText}>
          {type === 'create' ? 'Submit Sighting' : null}
          {type === 'edit' ? 'Save' : null}
        </Text>
      </Button>
      <Errorbar error={error} onDismiss={() => setError('')} />
    </>
  );
};
