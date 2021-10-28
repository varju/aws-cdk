import * as spec from '@jsii/spec';
import { TypeSystem } from 'jsii-reflect';

export function generateClassExample(typeSystem: TypeSystem, classType: spec.ClassType): string[] {
  const example: string[] = [];
  //if (!type.fqn.split('.')[1].startsWith('Cfn')) {
  // TODO: Classes without initializer or protected initializer
  if (classType.abstract) {
    console.log(`${classType.fqn} is an abstract class`);
  } else if (isStaticClass(classType.properties)){
    console.log(`${classType.fqn} is an enum-like class`);
  } else {
    console.log(`${classType.fqn} could have example`);
    example.push(`new ${classType.name}(this, 'My${classType.name}', {\n`);
    example.push(buildExample(typeSystem, classType, 1).join(''));
    example.push('});');
  }
  return example;
}

/**
 * Checks whether a class has only static methods, excluding the constructor.
 */
function isStaticClass(properties: spec.Property[] | undefined): boolean {
  // TODO: more robust checking for constructor method.
  let once = false;
  for (const prop of properties ?? []){
    if (!prop.static) {
      if (once) {
        return false;
      }
      once = true;
    }
  }
  return true;
}

function buildExample(typeSystem: TypeSystem, type: spec.Type, level: number): string[] {
  //
  if (level > 10) {
    return [];
  }
  const example: string[] = [];
  if (spec.isClassType(type)) {
    for (const params of type.initializer?.parameters ?? []) {
      example.push(`${tabLevel(level)}${params.name}: ${addProp(typeSystem, params.type, params.name, level)},\n`);
    }
  } else if (spec.isEnumType(type)) {
    example.push(`${type.name}.${type.members[0].name},\n`);
  } else if (spec.isInterfaceType(type)) {
    for (const props of type.properties ?? []) {
      example.push(`\n${tabLevel(level)}${props.name}: ${addProp(typeSystem, props.type, props.name, level)},`);
    }
    example.push(`\n${tabLevel(level-1)}`);
  }
  return example;
}

function addProp(typeSystem: TypeSystem, typeReference: spec.TypeReference, name: string, level: number): string {
  // Process primitive types, base case
  if (spec.isPrimitiveTypeReference(typeReference)) {
    switch (typeReference.primitive) {
      case spec.PrimitiveType.String: {
        return `'${name}'`;
      }
      case spec.PrimitiveType.Number: {
        return '0';
      }
      case spec.PrimitiveType.Boolean: {
        return 'false';
      }
      case spec.PrimitiveType.Any: {
        return '\'any-value\'';
      }
      default: {
        return '---';
      }
    }
  }

  // Just pick the first type if it is a union type
  if (spec.isUnionTypeReference(typeReference)) {
    console.log('union: ',name, JSON.stringify(typeReference));
    // TODO: which element should get picked?
    for (const newType of typeReference.union.types) {
      if (spec.isNamedTypeReference(newType) && newType.fqn.endsWith('.IResolvable')) {
        continue;
      }
      return addProp(typeSystem, newType, name, level);
    }
    const newType = typeReference.union.types[0];
    return addProp(typeSystem, newType, name, level);
  }

  // If its a collection create a collection of one element
  if (spec.isCollectionTypeReference(typeReference)) {
    //console.log('collectioN: ',name, typeReference);
    const collection = typeReference.collection;
    if (collection.kind === spec.CollectionKind.Array) {
      return `[${addProp(typeSystem, collection.elementtype,name, level+1)}]`;
    } else {
      return `{${addProp(typeSystem, collection.elementtype,name, level+1)}}`;
    }
  }

  // Process objects recursively
  if (spec.isNamedTypeReference(typeReference)) {
    //console.log('named: ',name, typeReference);
    const fqn = typeReference.fqn;
    // See if we have information on this type in the assembly
    const nextType = typeSystem.tryFindFqn(fqn)?.spec;
    //console.log('nextType: ', nextType?.fqn, typeReference.fqn);
    if (nextType) {
      return `{${buildExample(typeSystem, nextType, level+1)}}`;
    }
    return 'DNE';
  }

  return 'OH NO';
}

function tabLevel(level: number): string {
  return '  '.repeat(level);
}